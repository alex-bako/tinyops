\set ON_ERROR_STOP on

reset role;

create or replace function pg_temp.create_auth_user(
  target_id uuid,
  target_email text
)
returns void
language plpgsql
as $$
begin
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
    updated_at
  )
  values (
    '00000000-0000-0000-0000-000000000000',
    target_id,
    'authenticated',
    'authenticated',
    target_email,
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  )
  on conflict (id) do update
    set email = excluded.email,
        updated_at = now();
end;
$$;

create or replace function pg_temp.as_user(
  target_id uuid,
  target_email text
)
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', target_id::text, false);
  perform set_config('request.jwt.claim.email', target_email, false);
  perform set_config(
    'request.jwt.claims',
    jsonb_build_object(
      'sub', target_id::text,
      'email', target_email,
      'role', 'authenticated'
    )::text,
    false
  );
end;
$$;

create or replace function pg_temp.as_nobody()
returns void
language plpgsql
as $$
begin
  perform set_config('request.jwt.claim.sub', '', false);
  perform set_config('request.jwt.claim.email', '', false);
  perform set_config('request.jwt.claims', '', false);
end;
$$;

create or replace function pg_temp.assert_true(
  actual boolean,
  label text
)
returns void
language plpgsql
as $$
begin
  if not actual then
    raise exception 'Assertion failed: %', label;
  end if;
end;
$$;

delete from public.workspaces
where handle in ('handle-contract-taken', 'handle-contract-archived');

delete from public.profiles
where id = '00000000-0000-4000-8000-000000000301';

delete from auth.users
where id = '00000000-0000-4000-8000-000000000301';

select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000301',
  'owner-handle@example.co'
);

insert into public.profiles (id, email)
values (
  '00000000-0000-4000-8000-000000000301',
  'owner-handle@example.co'
);

insert into public.workspaces (name, handle, created_by)
values (
  'Handle Contract',
  'handle-contract-taken',
  '00000000-0000-4000-8000-000000000301'
);

-- An archived workspace still holds its handle: the unique index does not care that it
-- is archived, so neither may this answer.
insert into public.workspaces (name, handle, created_by, archived_at)
values (
  'Handle Contract Archived',
  'handle-contract-archived',
  '00000000-0000-4000-8000-000000000301',
  now()
);

------------------------------------------------------------------------------
-- A signed-in caller gets one boolean per handle.
------------------------------------------------------------------------------

select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000301',
  'owner-handle@example.co'
);
set role authenticated;

select pg_temp.assert_true(
  public.workspace_handle_available('handle-contract-free') is true,
  'handle nobody holds is available'
);

select pg_temp.assert_true(
  public.workspace_handle_available('handle-contract-taken') is false,
  'handle an existing workspace holds is not available'
);

select pg_temp.assert_true(
  public.workspace_handle_available('handle-contract-archived') is false,
  'handle an archived workspace holds is still not available'
);

reset role;

------------------------------------------------------------------------------
-- It exposes one boolean and nothing else: no name, no id, no count, no row.
------------------------------------------------------------------------------

select pg_temp.assert_true(
  (
    select pg_catalog.format_type(p.prorettype, null) = 'boolean'
      and not p.proretset
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'workspace_handle_available'
  ),
  'RPC returns a single boolean, not a row or a set'
);

select pg_temp.assert_true(
  (
    select count(*) = 1 and bool_and(format_type(t.oid, null) = 'text')
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    cross join lateral unnest(p.proargtypes) as a(oid)
    join pg_type t on t.oid = a.oid
    where n.nspname = 'public'
      and p.proname = 'workspace_handle_available'
  ),
  'RPC takes exactly one text argument'
);

select pg_temp.assert_true(
  (
    select p.prosecdef and p.proconfig @> array['search_path=public']
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'workspace_handle_available'
  ),
  'RPC is security definer with a pinned search_path'
);

------------------------------------------------------------------------------
-- anon cannot execute it at all, and a session without a user is refused.
------------------------------------------------------------------------------

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.workspace_handle_available(text)',
    'execute'
  ),
  'anon cannot execute the availability RPC'
);

select pg_temp.assert_true(
  has_function_privilege(
    'authenticated',
    'public.workspace_handle_available(text)',
    'execute'
  ),
  'authenticated can execute the availability RPC'
);

select pg_temp.as_nobody();
set role authenticated;

do $$
begin
  perform public.workspace_handle_available('handle-contract-free');
  raise exception 'Assertion failed: a session with no user was allowed to check a handle';
exception
  when insufficient_privilege then
    null;
end;
$$;

reset role;

delete from public.workspaces
where handle in ('handle-contract-taken', 'handle-contract-archived');

delete from public.profiles
where id = '00000000-0000-4000-8000-000000000301';

delete from auth.users
where id = '00000000-0000-4000-8000-000000000301';
