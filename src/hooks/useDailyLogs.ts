import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { supabase, getUserId } from "@/integrations/supabase/client";
import type { DailyLog, DailyLogInsert } from "@/types/log";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useMutationRateLimit } from "@/hooks/useMutationRateLimit";
import { logAuditEvent } from "@/hooks/useAuditLog";

const countField = z.number().int("Must be a whole number").nonnegative("Must be 0 or more").max(9999, "Value too large");

const DailyLogInsertSchema = z.object({
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  counts: z.record(countField),
  is_off_day: z.boolean(),
  notes: z.string().max(500, "Notes must be 500 characters or fewer").nullable().optional(),
});

export function useDailyLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily_logs", user?.id],
    enabled: !!user,
    // Pull remote changes so the counter/logs stay in sync across the user's
    // devices (another device's auto-save shows up here on focus/interval).
    // staleTime 0 opts out of the global default so focus always refetches.
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    queryFn: async (): Promise<DailyLog[]> => {
      const user_id = await getUserId();
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user_id)
        .order("log_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        counts: (row.counts ?? {}) as Record<string, number>,
      })) as DailyLog[];
    },
  });
}

export function useUpsertLog() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 20, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      if (!checkLimit()) throw new Error("Too many saves. Please wait a moment.");
      const validated = DailyLogInsertSchema.parse(log);
      const user_id = await getUserId();
      const { error } = await supabase
        .from("daily_logs")
        .upsert({ ...validated, user_id }, { onConflict: "user_id,log_date" });
      if (error) throw error;
      await logAuditEvent("log_updated", { log_date: validated.log_date });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
      toast.success("Day saved");
    },
    onError: (e: Error) => toast.error(e instanceof z.ZodError ? e.issues[0]?.message : e.message),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  const { checkLimit } = useMutationRateLimit({ maxRequests: 10, windowMs: 60_000 });
  return useMutation({
    mutationFn: async (id: string) => {
      if (!checkLimit()) throw new Error("Too many deletes. Please wait a moment.");
      const user_id = await getUserId();
      await logAuditEvent("log_deleted", { log_id: id });
      const { error } = await supabase.from("daily_logs").delete().eq("id", id).eq("user_id", user_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
      toast.success("Day deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
