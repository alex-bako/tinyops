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
where handle = 'onboarding-contract';

delete from public.auth_invites
where email in ('owner-onboarding@example.co', 'operator-onboarding@example.co');

delete from auth.users
where id = '00000000-0000-4000-8000-000000000201';

select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000201',
  'owner-onboarding@example.co'
);

select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000201',
  'owner-onboarding@example.co'
);
set role authenticated;

select public.complete_onboarding(
  'owner-onboarding@example.co',
  'Jamie',
  'Park',
  '2026-05-10T01:02:03.000Z'::timestamptz,
  'Onboarding Contract',
  'onboarding-contract',
  'letter',
  'O',
  'cobalt',
  'cobalt',
  'therapy',
  'Jamie at Contract',
  'csv',
  'strict',
  'low-only',
  array['crisis', 'trauma']::text[],
  true,
  array['operator-onboarding@example.co']::text[],
  array['operator']::text[]
) as workspace_id \gset

select public.complete_onboarding(
  'owner-onboarding@example.co',
  'Jamie',
  'Park',
  '2026-05-10T01:02:03.000Z'::timestamptz,
  'Onboarding Contract',
  'onboarding-contract',
  'letter',
  'O',
  'cobalt',
  'cobalt',
  'therapy',
  'Jamie at Contract',
  'csv',
  'strict',
  'low-only',
  array['crisis', 'trauma']::text[],
  true,
  array[]::text[],
  array[]::text[]
) as repeated_workspace_id \gset

reset role;

select pg_temp.assert_true(
  :'workspace_id' = :'repeated_workspace_id',
  'onboarding RPC is idempotent for an already visible workspace'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.profiles
    where id = '00000000-0000-4000-8000-000000000201'
      and email = 'owner-onboarding@example.co'
      and first_name = 'Jamie'
      and last_name = 'Park'
      and onboarded_at = '2026-05-10T01:02:03.000Z'::timestamptz
  ),
  'onboarding RPC persists profile state'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.workspaces
    where id = :'workspace_id'::uuid
      and handle = 'onboarding-contract'
      and vertical = 'therapy'
      and default_sender_name = 'Jamie at Contract'
      and initial_source_intent = 'csv'
      and sensitivity_mode = 'strict'
      and plan_tier = 'Team'
      and plan_price = '$0 / alpha'
      and plan_seats = 5
  ),
  'onboarding RPC persists workspace setup with alpha plan defaults'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.workspace_memberships
    where workspace_id = :'workspace_id'::uuid
      and user_id = '00000000-0000-4000-8000-000000000201'
      and role = 'owner'
  ),
  'onboarding RPC creates owner membership'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.workspace_invitations
    where workspace_id = :'workspace_id'::uuid
      and email = 'operator-onboarding@example.co'
      and role = 'operator'
      and accepted_at is null
      and revoked_at is null
  ),
  'onboarding RPC creates workspace invitation'
);

select pg_temp.assert_true(
  exists (
    select 1
    from public.auth_invites
    where email = 'operator-onboarding@example.co'
  ),
  'onboarding RPC registers auth invite'
);

delete from public.workspaces
where id = :'workspace_id'::uuid;

delete from public.auth_invites
where email in ('owner-onboarding@example.co', 'operator-onboarding@example.co');

delete from auth.users
where id = '00000000-0000-4000-8000-000000000201';
