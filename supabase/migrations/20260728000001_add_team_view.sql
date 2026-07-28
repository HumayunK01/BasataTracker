-- Allow reading all profiles so the Team page can list users.
-- ponytail: no admin guard yet; any authenticated user can see names.
drop policy if exists "Users can read own profile" on public.profiles;
create policy "Anyone can view profiles"
  on public.profiles for select
  using (true);

-- Security definer function to read all daily_logs, bypassing per-user RLS.
-- ponytail: no admin guard; add is_admin check if access needs restricting.
create or replace function public.get_team_daily_logs(limit_count int default 1000)
returns setof public.daily_logs
language sql
security definer
as $$
  select * from public.daily_logs
  order by log_date desc
  limit limit_count;
$$;
