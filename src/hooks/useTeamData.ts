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

// ── Admin read-all fetchers. RLS lets admins read every user's rows (see the
// "Admins can read all …" policies), so these query the tables directly.
// ponytail: fetch everything once and filter client-side — the dataset is
// small; switch to .eq("created_by", id) if it ever gets large.

interface TeamQueryOptions {
  staleTime?: number;
}

function useTeamTable<T>(key: string, table: string, build: (data: unknown[]) => T[], options?: TeamQueryOptions) {
  return useQuery<T[]>({
    queryKey: [key],
    staleTime: options?.staleTime ?? 30_000,
    queryFn: async () => {
      const { data, error } = await supabase.from(table).select("*").order("created_at", { ascending: false }).limit(5000);
      if (error) throw error;
      return build(data ?? []);
    },
  });
}

export interface TeamFaxedBackDoc {
  id: string;
  created_by: string;
  file_name: string;
  patient_name: string;
  patient_dob: string | null;
  worked_on: string;
  status: string;
  notes: string | null;
  created_at: string;
}

export function useTeamFaxedBackDocs() {
  return useTeamTable<TeamFaxedBackDoc>("team_faxed_back", "faxed_back_docs", (rows) => rows as TeamFaxedBackDoc[], { staleTime: 15_000 });
}

export interface TeamCategory {
  id: string;
  user_id: string;
  key: string;
  label: string;
  short: string;
  position: number;
}

export function useTeamCategories() {
  return useTeamTable<TeamCategory>("team_categories", "categories", (rows) => rows as TeamCategory[], { staleTime: 15_000 });
}

export interface TeamAuditLog {
  id: string;
  user_id: string;
  event: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

export function useTeamAuditLogs() {
  return useTeamTable<TeamAuditLog>("team_audit_logs", "audit_logs", (rows) => rows as TeamAuditLog[], { staleTime: 15_000 });
}

export function useSetUserRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetUserId, role, prevRole }: { targetUserId: string; role: "user" | "admin"; prevRole?: "user" | "admin" }) => {
      const { error } = await supabase.rpc("set_user_role", {
        target_user: targetUserId,
        new_role: role,
      });
      if (error) throw error;
      await logAuditEvent("role_changed", { target_user_id: targetUserId, role, prev_role: prevRole ?? null });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["team_profiles"] });
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
  });
}
