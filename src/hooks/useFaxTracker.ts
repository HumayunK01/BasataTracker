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

export function useFaxTracker() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["fax_tracker", user?.id],
    enabled: !!user,
    // Shared team tracker — keep it reasonably fresh across devices.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async (): Promise<FaxRow[]> => {
      const { data, error } = await supabase
        .from("fax_tracker")
        .select("*")
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
    mutationFn: async ({ id, input }: { id?: string; input: FaxInput }) => {
      if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
      const validated = FaxInsertSchema.parse(input);
      const created_by = await getUserId();
      if (id) {
        // RLS restricts updates to the row owner.
        const { error } = await supabase
          .from("fax_tracker")
          .update(validated)
          .eq("id", id)
          .eq("created_by", created_by);
        if (error) throw error;
        await logAuditEvent("fax_updated", { fax_id: id });
      } else {
        const { error } = await supabase
          .from("fax_tracker")
          .insert({ ...validated, created_by });
        if (error) throw error;
        await logAuditEvent("fax_created", { patient_name: validated.patient_name });
      }
    },
    onSuccess: (_d, { id }) => {
      qc.invalidateQueries({ queryKey: ["fax_tracker"] });
      toast.success(id ? "Patient updated" : "Patient added");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
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
