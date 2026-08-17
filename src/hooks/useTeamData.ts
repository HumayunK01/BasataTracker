import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { DailyLog } from "@/types/log";
import type { Profile } from "@/hooks/useProfile";
import { logAuditEvent } from "@/hooks/useAuditLog";

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

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role }: { targetUserId: string; role: "user" | "admin" }) => {
      const { error } = await supabase.rpc("set_user_role", {
        target_user: targetUserId,
        new_role: role,
      });
      if (error) throw error;
      await logAuditEvent("role_changed", { target_user_id: targetUserId, role });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
