import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DailyLog, DailyLogInsert } from "@/types/log";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

async function getUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return user.id;
}

export function useDailyLogs() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["daily_logs", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<DailyLog[]> => {
      const user_id = await getUserId();
      const { data, error } = await supabase
        .from("daily_logs")
        .select("*")
        .eq("user_id", user_id)
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
      qc.invalidateQueries({ queryKey: ["daily_logs"] });
      toast.success("Day saved");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user_id = await getUserId();
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
