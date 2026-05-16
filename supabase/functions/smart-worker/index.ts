import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Mirror the client's isoDate(): "today" in America/Chicago, not UTC, so the
// function and UI agree on which day's logs to return around midnight.
function chicagoToday(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Verify the caller is an authenticated user.
  const anonClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );
  const { data: { user }, error: authError } = await anonClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const today = chicagoToday();

  // Service role bypasses RLS so we can read every user's row for today.
  const adminClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const [
    { data: authData, error: authListError },
    { data: profiles, error: profilesError },
    { data: logs, error: logsError },
  ] = await Promise.all([
    adminClient.auth.admin.listUsers({ perPage: 1000 }),
    adminClient.from("profiles").select("id, first_name, last_name"),
    adminClient
      .from("daily_logs")
      .select("user_id, counts, is_off_day, notes, updated_at")
      .eq("log_date", today),
  ]);

  const firstError = authListError ?? profilesError ?? logsError;
  if (firstError) {
    return new Response(JSON.stringify({ error: firstError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const logMap = new Map((logs ?? []).map((l) => [l.user_id, l]));

  const activity = (authData?.users ?? []).map((u) => {
    const profile = profileMap.get(u.id);
    const log = logMap.get(u.id);
    const counts = (log?.counts ?? {}) as Record<string, number>;
    const total = Object.values(counts).reduce((s, v) => s + (Number(v) || 0), 0);
    return {
      user_id: u.id,
      email: u.email ?? "",
      first_name: profile?.first_name ?? "",
      last_name: profile?.last_name ?? "",
      logged: !!log,
      is_off_day: log?.is_off_day ?? false,
      counts,
      total,
      notes: log?.notes ?? null,
      updated_at: log?.updated_at ?? null,
    };
  });

  return new Response(JSON.stringify({ date: today, activity }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
