-- Admin user creation function
-- Allows administrators to create new user accounts directly from the Team page.
-- Run in Supabase SQL Editor.

create or replace function public.admin_create_user(
  new_email text,
  new_password text,
  new_first_name text default '',
  new_last_name text default '',
  new_role text default 'user'
)
returns uuid
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
declare
  new_user_id uuid;
  encrypted_pw text;
begin
  -- 1. Security check: Only admins can invoke this function
  if not public.is_admin() then
    raise exception 'Only administrators can create new users.';
  end if;

  -- 2. Input validation
  new_email := lower(trim(new_email));
  if new_email = '' or new_email not like '%@%.%' then
    raise exception 'A valid email address is required.';
  end if;

  if length(new_password) < 6 then
    raise exception 'Password must be at least 6 characters long.';
  end if;

  if new_role not in ('user', 'admin') then
    raise exception 'Invalid role. Must be either "user" or "admin".';
  end if;

  -- 3. Check if email already exists
  if exists (select 1 from auth.users where lower(email) = new_email) then
    raise exception 'A user with this email already exists.';
  end if;

  -- 4. Generate user ID and encrypt password using Blowfish crypt
  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(new_password, gen_salt('bf'));

  -- 5. Insert into auth.users
  insert into auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    new_email,
    encrypted_pw,
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    jsonb_build_object('first_name', trim(new_first_name), 'last_name', trim(new_last_name)),
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

  -- 6. Insert into auth.identities (supports modern Supabase with UUID id & provider_id, plus legacy schemas)
  begin
    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    ) values (
      gen_random_uuid(),
      new_user_id,
      jsonb_build_object('sub', new_user_id::text, 'email', new_email),
      'email',
      new_user_id::text,
      null,
      now(),
      now()
    );
  exception
    when undefined_column then
      -- Legacy Supabase schema: no provider_id column, id was text
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        new_user_id::text,
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', new_email),
        'email',
        null,
        now(),
        now()
      );
    when datatype_mismatch then
      -- In case id is text in a schema that has provider_id
      insert into auth.identities (
        id,
        user_id,
        identity_data,
        provider,
        provider_id,
        last_sign_in_at,
        created_at,
        updated_at
      ) values (
        new_user_id::text,
        new_user_id,
        jsonb_build_object('sub', new_user_id::text, 'email', new_email),
        'email',
        new_user_id::text,
        null,
        now(),
        now()
      );
  end;

  -- 7. Ensure profile exists and set role
  insert into public.profiles (id, first_name, last_name, role)
  values (new_user_id, trim(new_first_name), trim(new_last_name), new_role)
  on conflict (id) do update set
    first_name = excluded.first_name,
    last_name = excluded.last_name,
    role = excluded.role,
    updated_at = now();

  return new_user_id;
end;
$$;

revoke all on function public.admin_create_user(text, text, text, text, text) from public;
grant execute on function public.admin_create_user(text, text, text, text, text) to authenticated;
