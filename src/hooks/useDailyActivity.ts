import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface DailyActivityRow {
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
  logged: boolean;
  is_off_day: boolean;
  counts: Record<string, number>;
  total: number;
  notes: string | null;
  updated_at: string | null;
}

export interface DailyActivityResponse {
  date: string;
  activity: DailyActivityRow[];
}

async function fetchDailyActivity(): Promise<DailyActivityResponse> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Not authenticated");

  const { data, error } = await supabase.functions.invoke("smart-worker", {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  return data as DailyActivityResponse;
}

/** Today's logged activity (counter/daily-log) for every user. No history. */
export function useDailyActivity() {
  return useQuery({
    queryKey: ["daily-activity"],
    queryFn: fetchDailyActivity,
    staleTime: 10_000,
    refetchInterval: 20_000,
    // Keep polling even when the tab is in the background so the view is
    // already current the moment the user returns to it.
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: true,
  });
}
