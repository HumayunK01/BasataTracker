import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DailyLog } from "@/types/log";
import type { Profile } from "@/hooks/useProfile";

export function useTeamProfiles() {
  return useQuery<Profile[]>({
    queryKey: ["team_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").order("first_name");
      if (error) throw error;
      return (data ?? []) as Profile[];
    },
  });
}

export function useTeamDailyLogs() {
  return useQuery<DailyLog[]>({
    queryKey: ["team_daily_logs"],
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_team_daily_logs", { limit_count: 2000 });
      if (error) throw error;
      return ((data ?? []) as DailyLog[]).map((row) => ({
        ...row,
        counts: (row.counts ?? {}) as Record<string, number>,
      }));
    },
  });
}
