-- Migration: Add account disabling (deactivation) support.
-- Preserves all user rows (daily logs, faxed back docs, audit logs, categories)
-- while blocking authentication and logins.

-- 1. Add is_disabled to public.profiles
alter table public.profiles
  add column if not exists is_disabled boolean not null default false,
  add column if not exists disabled_at timestamptz;

-- 2. Create admin function to disable/re-enable a user
create or replace function public.set_user_disabled(target_user uuid, should_disable boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid;
begin
  caller_id := auth.uid();

  -- Security check: caller must be admin
  if not public.is_admin() then
    raise exception 'Only administrators can disable or enable accounts';
  end if;

  -- Safety check: an admin cannot disable their own account
  if target_user = caller_id and should_disable then
    raise exception 'Administrators cannot disable their own account';
  end if;

  -- Update auth.users banned_until timestamp
  -- Setting banned_until into the far future revokes active sessions and prevents logins in GoTrue
  if should_disable then
    update auth.users
      set banned_until = '2099-12-31 23:59:59+00'
      where id = target_user;
  else
    update auth.users
      set banned_until = null
      where id = target_user;
  end if;

  -- Update public.profiles
  update public.profiles
    set is_disabled = should_disable,
        disabled_at = case when should_disable then now() else null end,
        updated_at = now()
    where id = target_user;

  -- Record audit log if audit_logs table exists
  insert into public.audit_logs (user_id, event, details)
  values (
    caller_id,
    case when should_disable then 'account_disabled' else 'account_enabled' end,
    jsonb_build_object('target_user_id', target_user, 'disabled', should_disable)
  );
end;
$$;

revoke all on function public.set_user_disabled(uuid, boolean) from public;
grant execute on function public.set_user_disabled(uuid, boolean) to authenticated;
