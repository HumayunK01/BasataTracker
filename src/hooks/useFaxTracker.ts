import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";
import type { Tables } from "@/integrations/supabase/types";

export type FaxStepStatus = "Failed" | "Successfully Sent" | "Waiting" | "Pending";
export type FaxRow = Tables<"fax_tracker">;

export const STEP_STATUSES: FaxStepStatus[] = ["Pending", "Waiting", "Successfully Sent", "Failed"];

const stepEnum = z.enum(["Failed", "Successfully Sent", "Waiting", "Pending"]);

// Normalize names to Title Case so "GRECIA DENIZ" / "grecia deniz" both save as
// "Grecia Deniz". Re-cases around spaces, hyphens, and apostrophes (e.g. "O'Brien").
export function toTitleCase(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[A-Za-z]+(?:[-'][A-Za-z]+)*/g, (word) =>
      word.replace(/[A-Za-z]+/g, (part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()),
    );
}

const FaxInsertSchema = z.object({
  patient_name: z
    .string()
    .trim()
    .min(1, "Patient name is required")
    .max(200, "Name too long")
    .transform(toTitleCase),
  step1: stepEnum,
  step2: stepEnum.nullable(),
  step3: stepEnum.nullable(),
  notes: z.string().max(1000, "Notes must be 1000 characters or fewer").nullable().optional(),
});

export type FaxInput = z.infer<typeof FaxInsertSchema>;

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export function useFaxTracker(accountId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fax_tracker", user?.id, accountId],
    enabled: !!user && !!accountId,
    // Per-account list — keep it reasonably fresh across devices.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FaxRow[]> => {
      const { data, error } = await supabase
        .from("fax_tracker")
        .select("*")
        .eq("account_id", accountId!)
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useUpsertFax() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 30, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, input, accountId }: { id?: string; input: FaxInput; accountId?: string }) => {
      if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
      const validated = FaxInsertSchema.parse(input);
      const created_by = await getUserId();
      if (id) {
        // RLS restricts updates to the row owner. account_id is not changed on edit.
        const { error } = await supabase
          .from("fax_tracker")
          .update(validated)
          .eq("id", id)
          .eq("created_by", created_by);
        if (error) throw error;
        await logAuditEvent("fax_updated", { fax_id: id });
      } else {
        if (!accountId) throw new Error("No account selected.");
        const { error } = await supabase
          .from("fax_tracker")
          .insert({ ...validated, created_by, account_id: accountId });
        if (error) throw error;
        await logAuditEvent("fax_created", { patient_name: validated.patient_name, account_id: accountId });
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["fax_tracker"] });
      toast.success(id ? "Patient updated" : "Patient added");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export type StepField = "step1" | "step2" | "step3";

// Apply a single-step change and enforce the workflow rules:
//  - a step set to "Successfully Sent" resolves the case → clear later steps
//  - step2/step3 only apply once the prior step has Failed
// Returns the normalized {step1, step2, step3}.
export function normalizeSteps(
  row: Pick<FaxRow, "step1" | "step2" | "step3">,
  field: StepField,
  value: FaxStepStatus,
): { step1: FaxStepStatus; step2: FaxStepStatus | null; step3: FaxStepStatus | null } {
  let step1 = row.step1;
  let step2 = row.step2;
  let step3 = row.step3;
  if (field === "step1") step1 = value;
  if (field === "step2") step2 = value;
  if (field === "step3") step3 = value;

  // Later steps only exist while the prior step is a Failure.
  if (step1 === "Successfully Sent") { step2 = null; step3 = null; }
  else if (step1 !== "Failed") { step2 = null; step3 = null; }
  else if (step2 === "Successfully Sent") { step3 = null; }
  else if (step2 !== "Failed") { step3 = null; }

  return { step1, step2, step3 };
}

export function useUpdateStep() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 40, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ row, field, value }: { row: FaxRow; field: StepField; value: FaxStepStatus }) => {
      if (!checkLimit()) throw new Error("Too many updates. Please wait a moment.");
      const created_by = await getUserId();
      const patch = normalizeSteps(row, field, value);
      const { error } = await supabase
        .from("fax_tracker")
        .update(patch)
        .eq("id", row.id)
        .eq("created_by", created_by);
      if (error) throw error;
      await logAuditEvent("fax_updated", { fax_id: row.id, field, value });
    },
    // Optimistic: reflect the change instantly, roll back on error.
    onMutate: async ({ row, field, value }) => {
      await qc.cancelQueries({ queryKey: ["fax_tracker"] });
      const key = ["fax_tracker"];
      const snapshots = qc.getQueriesData<FaxRow[]>({ queryKey: key });
      const patch = normalizeSteps(row, field, value);
      for (const [qKey, data] of snapshots) {
        if (!data) continue;
        qc.setQueryData<FaxRow[]>(qKey, data.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
      }
      return { snapshots };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots.forEach(([qKey, data]) => qc.setQueryData(qKey, data));
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["fax_tracker"] });
    },
  });
}

export function useDeleteFax() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 15, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      const created_by = await getUserId();
      await logAuditEvent("fax_deleted", { fax_id: id });
      const { error } = await supabase
        .from("fax_tracker")
        .delete()
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["fax_tracker"] });
      toast.success("Patient deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
