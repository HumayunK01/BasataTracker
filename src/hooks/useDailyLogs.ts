import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DailyLog, DailyLogInsert } from "@/types/log";
import { toast } from "sonner";

const KEY = ["daily_logs"] as const;

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export function useDailyLogs() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<DailyLog[]> => {
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .order("log_date", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as DailyLog[];
    },
  });
}

export function useUpsertLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (log: DailyLogInsert) => {
      const user_id = await getUserId();
      const { error } = await supabase
        .from("daily_logs")
        .upsert({ ...log, user_id }, { onConflict: "user_id,log_date" });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Day saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("daily_logs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
      toast.success("Day deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
