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

  insert into public.profiles (id, email)
  values (target_id, target_email)
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

create or replace function pg_temp.expect_error(
  statement text,
  expected_message text,
  label text
)
returns void
language plpgsql
as $$
begin
  execute statement;
  raise exception 'Expected error for %', label;
exception
  when others then
    if sqlerrm = format('Expected error for %s', label) then
      raise;
    end if;

    if sqlerrm <> expected_message then
      raise exception 'Expected %, got % for %', expected_message, sqlerrm, label;
    end if;
end;
$$;

delete from public.workspaces
where handle = 'rpc-contract-owner';

delete from public.auth_invites
where email in (
  'member@example.co',
  'pending@example.co',
  'pending-2@example.co',
  'pending-3@example.co',
  'overflow@example.co'
);

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102'
);

select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000101',
  'owner@example.co'
);
select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000102',
  'member@example.co'
);

select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000101',
  'owner@example.co'
);
set role authenticated;
select public.create_personal_workspace(
  'RPC Contract Workspace',
  'rpc-contract-owner',
  'owner@example.co'
) as workspace_id \gset
reset role;

select set_config('tinyops.workspace_id', :'workspace_id', false);

insert into public.workspace_memberships (
  workspace_id,
  user_id,
  role
)
values (
  current_setting('tinyops.workspace_id')::uuid,
  '00000000-0000-4000-8000-000000000102',
  'operator'
);

select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000101',
  'owner@example.co'
);
set role authenticated;

select pg_temp.expect_error(
  format(
    'select public.create_workspace_invitation(%L::uuid, %L, %L)',
    current_setting('tinyops.workspace_id'),
    'member@example.co',
    'viewer'
  ),
  'duplicate_invite',
  'duplicate member invite'
);

select public.create_workspace_invitation(
  current_setting('tinyops.workspace_id')::uuid,
  'pending@example.co',
  'viewer'
);

select pg_temp.expect_error(
  format(
    'select public.create_workspace_invitation(%L::uuid, %L, %L)',
    current_setting('tinyops.workspace_id'),
    'pending@example.co',
    'operator'
  ),
  'duplicate_invite',
  'duplicate pending invite'
);

select public.create_workspace_invitation(
  current_setting('tinyops.workspace_id')::uuid,
  'pending-2@example.co',
  'viewer'
);
select public.create_workspace_invitation(
  current_setting('tinyops.workspace_id')::uuid,
  'pending-3@example.co',
  'viewer'
);

select pg_temp.expect_error(
  format(
    'select public.create_workspace_invitation(%L::uuid, %L, %L)',
    current_setting('tinyops.workspace_id'),
    'overflow@example.co',
    'viewer'
  ),
  'seat_limit_reached',
  'workspace seat limit'
);

reset role;

select pg_temp.assert_true(
  exists (
    select 1
    from public.auth_invites
    where email = 'pending@example.co'
  ),
  'workspace invite registers auth invite'
);

select pg_temp.assert_true(
  (
    select count(*)
    from public.workspace_invitations invitation
    where invitation.workspace_id = current_setting('tinyops.workspace_id')::uuid
      and invitation.accepted_at is null
      and invitation.revoked_at is null
  ) = 3,
  'only successful workspace invitations are persisted'
);

delete from public.workspaces
where handle = 'rpc-contract-owner';

delete from public.auth_invites
where email in (
  'member@example.co',
  'pending@example.co',
  'pending-2@example.co',
  'pending-3@example.co',
  'overflow@example.co'
);

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000102'
);
