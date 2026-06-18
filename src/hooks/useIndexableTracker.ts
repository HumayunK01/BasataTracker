import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";
import { isoDate } from "@/types/log";
import { toTitleCase } from "@/hooks/useFaxTracker";
import type { Tables } from "@/integrations/supabase/types";

export type IndexableStepStatus = "Failed" | "Successfully Sent" | "Waiting" | "Pending";
export type IndexableRow = Tables<"indexable_tracker">;

// Synthetic category surfaced on the Dashboard/Report for indexable work. Not
// stored in the categories table — derived from indexable rows at read time.
export const INDEXABLE_CATEGORY_KEY = "indexable_resolved";
export const INDEXABLE_CATEGORY_LABEL = "Indexable Resolved";
export const INDEXABLE_CATEGORY_SHORT = "Indexable";

// A case is "resolved" once any step is Successfully Sent (matching the DB's
// generated overall_status).
export function isResolved(steps: Pick<IndexableRow, "step1" | "step2" | "step3">): boolean {
  return steps.step1 === "Successfully Sent"
    || steps.step2 === "Successfully Sent"
    || steps.step3 === "Successfully Sent";
}

export const STEP_STATUSES: IndexableStepStatus[] = ["Pending", "Waiting", "Successfully Sent", "Failed"];

const stepEnum = z.enum(["Failed", "Successfully Sent", "Waiting", "Pending"]);

const IndexableInsertSchema = z.object({
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

export type IndexableInput = z.infer<typeof IndexableInsertSchema>;

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export function useIndexableTracker(accountId?: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["indexable_tracker", user?.id, accountId],
    enabled: !!user && !!accountId,
    // Per-account list — keep it reasonably fresh across devices.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async (): Promise<IndexableRow[]> => {
      const { data, error } = await supabase
        .from("indexable_tracker")
        .select("*")
        .eq("account_id", accountId!)
        .order("created_at", { ascending: true })
        .limit(2000);
      if (error) throw error;
      return data ?? [];
    },
  });
}

/**
 * Fetch indexable rows across ALL of the user's accounts (RLS scopes to the
 * user). Used by the exporter when including other IDs' results too.
 */
export async function fetchAllIndexableRows(): Promise<IndexableRow[]> {
  const { data, error } = await supabase
    .from("indexable_tracker")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(5000);
  if (error) throw error;
  return data ?? [];
}

/**
 * Resolved-indexable counts per day across ALL of the user's accounts, keyed by
 * the day the patient was last updated (its best available "resolved on" date).
 * Derived at read time — fully retroactive, no writes. Feeds the Dashboard and
 * Report so indexable work shows alongside the user's document categories.
 */
export function useIndexableResolvedByDay() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["indexable_resolved_by_day", user?.id],
    enabled: !!user,
    staleTime: 60_000,
    queryFn: async (): Promise<Record<string, number>> => {
      // RLS already scopes to the current user; only the columns we need.
      const { data, error } = await supabase
        .from("indexable_tracker")
        .select("step1, step2, step3, updated_at")
        .limit(5000);
      if (error) throw error;
      const byDay: Record<string, number> = {};
      for (const r of data ?? []) {
        if (!isResolved(r)) continue;
        const day = isoDate(new Date(r.updated_at));
        byDay[day] = (byDay[day] ?? 0) + 1;
      }
      return byDay;
    },
  });
}

export function useUpsertIndexable() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 30, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ id, input, accountId }: { id?: string; input: IndexableInput; accountId?: string }) => {
      if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
      const validated = IndexableInsertSchema.parse(input);
      const created_by = await getUserId();
      if (id) {
        // RLS restricts updates to the row owner. account_id is not changed on edit.
        const { error } = await supabase
          .from("indexable_tracker")
          .update(validated)
          .eq("id", id)
          .eq("created_by", created_by);
        if (error) throw error;
        await logAuditEvent("indexable_updated", { indexable_id: id });
      } else {
        if (!accountId) throw new Error("No account selected.");
        const { error } = await supabase
          .from("indexable_tracker")
          .insert({ ...validated, created_by, account_id: accountId });
        if (error) throw error;
        await logAuditEvent("indexable_created", { patient_name: validated.patient_name, account_id: accountId });
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["indexable_tracker"] });
      toast.success(id ? "Patient updated" : "Patient added");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export type StepField = "step1" | "step2" | "step3";

// Apply a single-step change. Indexable steps are independent — any step can be
// set on its own (e.g. mark step 3 "Successfully Sent" without touching 1 & 2),
// so we only write the changed step and leave the others as they were. step2/
// step3 default to "Pending" rather than null so they remain selectable, and a
// "Successfully Sent" on any step resolves the case (see isResolved).
export function normalizeSteps(
  row: Pick<IndexableRow, "step1" | "step2" | "step3">,
  field: StepField,
  value: IndexableStepStatus,
): { step1: IndexableStepStatus; step2: IndexableStepStatus | null; step3: IndexableStepStatus | null } {
  return {
    step1: field === "step1" ? value : row.step1,
    step2: field === "step2" ? value : (row.step2 ?? "Pending"),
    step3: field === "step3" ? value : (row.step3 ?? "Pending"),
  };
}

export function useUpdateStep() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 40, windowMs: 60_000 });
  return useMutation({
    mutationFn: async ({ row, field, value }: { row: IndexableRow; field: StepField; value: IndexableStepStatus }) => {
      if (!checkLimit()) throw new Error("Too many updates. Please wait a moment.");
      const created_by = await getUserId();
      const patch = normalizeSteps(row, field, value);
      const { error } = await supabase
        .from("indexable_tracker")
        .update(patch)
        .eq("id", row.id)
        .eq("created_by", created_by);
      if (error) throw error;
      await logAuditEvent("indexable_updated", { indexable_id: row.id, field, value });
    },
    // Optimistic: reflect the change instantly, roll back on error.
    onMutate: async ({ row, field, value }) => {
      await qc.cancelQueries({ queryKey: ["indexable_tracker"] });
      const key = ["indexable_tracker"];
      const snapshots = qc.getQueriesData<IndexableRow[]>({ queryKey: key });
      const patch = normalizeSteps(row, field, value);
      for (const [qKey, data] of snapshots) {
        if (!data) continue;
        qc.setQueryData<IndexableRow[]>(qKey, data.map((r) => (r.id === row.id ? { ...r, ...patch } : r)));
      }
      return { snapshots };
    },
    onError: (e: Error, _vars, ctx) => {
      ctx?.snapshots.forEach(([qKey, data]) => qc.setQueryData(qKey, data));
      toast.error(e.message);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["indexable_tracker"] });
    },
  });
}

export function useDeleteIndexable() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 15, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      const created_by = await getUserId();
      await logAuditEvent("indexable_deleted", { indexable_id: id });
      const { error } = await supabase
        .from("indexable_tracker")
        .delete()
        .eq("id", id)
        .eq("created_by", created_by);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["indexable_tracker"] });
      toast.success("Patient deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
