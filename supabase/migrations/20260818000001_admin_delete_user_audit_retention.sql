-- Admin helpers, user deletion, audit retention, and admin read-all policies.
-- Run once: supabase db push (or paste into the SQL editor).

-- ── is_admin(): role lives in profiles, so this is a security-definer lookup ──
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ── delete_user: admin-only delete of another account ──
-- Deletes the auth.users row; profiles/daily_logs/categories/trackers/
-- faxed_back_docs cascade. Audit logs are kept (FK below is SET NULL).
create or replace function public.delete_user(target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only admins can delete users';
  end if;
  delete from auth.users where id = target_user;
end;
$$;

revoke all on function public.delete_user(uuid) from public;
grant execute on function public.delete_user(uuid) to authenticated;

-- ── Keep audit history after an account is deleted (was ON DELETE CASCADE) ──
alter table public.audit_logs
  alter column user_id drop not null,
  drop constraint audit_logs_user_id_fkey,
  add constraint audit_logs_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete set null;

-- ── Admins read every user's rows (Team panel) ──
-- Dropped + recreated so re-running is safe.
drop policy if exists "Admins can read all daily_logs" on public.daily_logs;
create policy "Admins can read all daily_logs"
  on public.daily_logs for select
  using (public.is_admin());

drop policy if exists "Admins can read all faxed_back_docs" on public.faxed_back_docs;
create policy "Admins can read all faxed_back_docs"
  on public.faxed_back_docs for select
  using (public.is_admin());

drop policy if exists "Admins can read all audit_logs" on public.audit_logs;
create policy "Admins can read all audit_logs"
  on public.audit_logs for select
  using (public.is_admin());

drop policy if exists "Admins can read all categories" on public.categories;
create policy "Admins can read all categories"
  on public.categories for select
  using (public.is_admin());