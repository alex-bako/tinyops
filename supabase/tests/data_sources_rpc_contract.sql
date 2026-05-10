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
where handle = 'data-source-rpc-owner';

delete from auth.users
where id in (
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  '00000000-0000-4000-8000-000000000203'
);

select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000201',
  'owner-ds@example.co'
);
select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000202',
  'admin-ds@example.co'
);
select pg_temp.create_auth_user(
  '00000000-0000-4000-8000-000000000203',
  'operator-ds@example.co'
);

select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000201',
  'owner-ds@example.co'
);
set role authenticated;
select public.create_personal_workspace(
  'Data Source RPC Workspace',
  'data-source-rpc-owner',
  'owner-ds@example.co'
) as workspace_id \gset
reset role;

select set_config('tinyops.workspace_id', :'workspace_id', false);

insert into public.workspace_memberships (
  workspace_id,
  user_id,
  role
)
values
  (
    current_setting('tinyops.workspace_id')::uuid,
    '00000000-0000-4000-8000-000000000202',
    'admin'
  ),
  (
    current_setting('tinyops.workspace_id')::uuid,
    '00000000-0000-4000-8000-000000000203',
    'operator'
  );

select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000201',
  'owner-ds@example.co'
);
set role authenticated;

select pg_temp.expect_error(
  format(
    'select public.connect_imap_data_source(%L::uuid, %L, %L, %L, %L, %L, %L, %L::text[], %L::text[], %L::jsonb, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    '',
    70000,
    'ssl',
    '',
    'secret',
    '12mo',
    array['INBOX'],
    array[]::text[],
    '{"mode":"and","rules":[]}',
    '[]'
  ),
  'invalid_imap_config',
  'invalid IMAP config'
);

select pg_temp.expect_error(
  format(
    'select public.connect_imap_data_source(%L::uuid, %L, %L, %L, %L, %L, %L, %L::text[], %L::text[], %L::jsonb, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    'imap.example.com',
    993,
    'ssl',
    'owner@example.com',
    'secret',
    '12mo',
    array['INBOX'],
    array[]::text[],
    '{"mode":"or","rules":[{"id":"rule_1","field":"subject","operator":"contains","value":"invoice"}]}',
    '[]'
  ),
  'invalid_imap_config',
  'invalid IMAP message filters'
);

select public.connect_imap_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  ' IMAP.EXAMPLE.COM ',
  993,
  'ssl',
  ' owner@example.com ',
  'top-secret',
  '12mo',
  array[' INBOX ', 'Clients', ''],
  array[' *@noreply.* ', ''],
  '{"mode":"and","rules":[{"id":"rule_1","field":"subject","operator":"does_not_contain","value":"invoice"}]}'::jsonb,
  '[{"path":"INBOX","messages":1204},{"path":"Clients","messages":412}]'::jsonb
) as source_id \gset

select set_config('tinyops.source_id', :'source_id', false);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_sources
    where workspace_id = current_setting('tinyops.workspace_id')::uuid
      and source_type = 'imap'
      and disconnected_at is null
  ),
  'one active IMAP source after connect'
);

select pg_temp.assert_true(
  (
    select config @> jsonb_build_object(
      'host', 'imap.example.com',
      'username', 'owner@example.com'
    )
    and not (config ? 'watchedFolders')
    and not (config ? 'skipSenders')
    from public.data_sources
    where id = current_setting('tinyops.source_id')::uuid
  ),
  'connect stores IMAP connection config separately'
);

select pg_temp.assert_true(
  (
    select watched_folders = array['INBOX', 'Clients']::text[]
      and skip_senders = array['*@noreply.*']::text[]
      and message_filters @> '{"mode":"and"}'::jsonb
      and available_folders @> '[{"path":"INBOX","messages":1204}]'::jsonb
    from public.data_source_intake_configs
    where source_id = current_setting('tinyops.source_id')::uuid
  ),
  'connect normalizes IMAP intake config'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_source_secrets
    where source_id = current_setting('tinyops.source_id')::uuid
      and purpose = 'imap_password'
      and masked_value = '****cret'
      and replaced_at is null
  ),
  'connect stores masked secret metadata'
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.data_source_secrets
    where source_id = current_setting('tinyops.source_id')::uuid
      and masked_value = 'top-secret'
  ),
  'raw IMAP password is not stored as metadata'
);

select pg_temp.assert_true(
  public.connect_imap_data_source(
    current_setting('tinyops.workspace_id')::uuid,
    'imap2.example.com',
    993,
    'starttls',
    'owner2@example.com',
    'new-secret',
    '90d',
    array['INBOX']::text[],
    array[]::text[],
    '{"mode":"and","rules":[]}'::jsonb,
    '[{"path":"INBOX","messages":1}]'::jsonb
  ) = current_setting('tinyops.source_id')::uuid,
  'second connect updates the active IMAP source'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_sources
    where workspace_id = current_setting('tinyops.workspace_id')::uuid
      and source_type = 'imap'
      and disconnected_at is null
  ),
  'only one active IMAP source remains after reconnect'
);

reset role;
select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000202',
  'admin-ds@example.co'
);
set role authenticated;

select public.update_imap_connection_settings(
  current_setting('tinyops.workspace_id')::uuid,
  current_setting('tinyops.source_id')::uuid,
  'imap3.example.com',
  993,
  'ssl',
  'admin@example.com',
  'rotated-pass',
  '[{"path":"Receipts","messages":9}]'::jsonb
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_source_intake_configs
    where source_id = current_setting('tinyops.source_id')::uuid
      and history_window = '90d'
      and watched_folders = array['INBOX']::text[]
      and message_filters @> '{"mode":"and"}'::jsonb
  ),
  'connection update preserves existing intake config'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_source_secrets
    where source_id = current_setting('tinyops.source_id')::uuid
      and purpose = 'imap_password'
      and masked_value = '****pass'
      and replaced_at is null
  ),
  'connection update rotates active IMAP password secret'
);

reset role;
set role service_role;

select pg_temp.assert_true(
  public.read_imap_data_source_password(
    current_setting('tinyops.workspace_id')::uuid,
    current_setting('tinyops.source_id')::uuid
  ) = 'rotated-pass',
  'service role can decrypt the active IMAP password'
);

select pg_temp.expect_error(
  format(
    'select public.read_imap_data_source_password(%L::uuid, gen_random_uuid())',
    current_setting('tinyops.workspace_id')
  ),
  'source_not_found',
  'read password rejects missing source'
);

reset role;
select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.read_imap_data_source_password(uuid, uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute read password RPC'
);

reset role;
update public.data_source_secrets
set replaced_at = now()
where source_id = current_setting('tinyops.source_id')::uuid
  and purpose = 'imap_password'
  and replaced_at is null;

set role service_role;

select pg_temp.expect_error(
  format(
    'select public.read_imap_data_source_password(%L::uuid, %L::uuid)',
    current_setting('tinyops.workspace_id'),
    current_setting('tinyops.source_id')
  ),
  'invalid_imap_config',
  'read password rejects missing active secret'
);

reset role;
select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000202',
  'admin-ds@example.co'
);
set role authenticated;

select public.update_imap_intake_config(
  current_setting('tinyops.workspace_id')::uuid,
  current_setting('tinyops.source_id')::uuid,
  '30d',
  array['Receipts']::text[],
  array['notifications@example.com']::text[],
  '{"mode":"and","rules":[]}'::jsonb
);

select public.update_imap_folder_snapshot(
  current_setting('tinyops.workspace_id')::uuid,
  current_setting('tinyops.source_id')::uuid,
  '[{"path":"Receipts","messages":10}]'::jsonb
);

select public.request_data_source_sync(
  current_setting('tinyops.workspace_id')::uuid,
  current_setting('tinyops.source_id')::uuid
);

select pg_temp.assert_true(
  (
    select status = 'queued'
    from public.data_source_sync_states
    where source_id = current_setting('tinyops.source_id')::uuid
  ),
  'admin can request source sync'
);

reset role;
set role service_role;

-- claim_next_data_source_sync is a global worker queue; make this contract
-- row deterministic even when a developer has other local queued sources.
update public.data_source_sync_states
set requested_at = '-infinity'::timestamptz
where source_id = current_setting('tinyops.source_id')::uuid;

select source_id as claimed_source_id,
       workspace_id as claimed_workspace_id,
       source_type as claimed_source_type,
       lease_token as claimed_lease_token
from public.claim_next_data_source_sync('worker_1', 120) \gset

select pg_temp.assert_true(
  :'claimed_source_id'::uuid = current_setting('tinyops.source_id')::uuid
    and :'claimed_workspace_id'::uuid = current_setting('tinyops.workspace_id')::uuid
    and :'claimed_source_type' = 'imap'
    and btrim(:'claimed_lease_token') <> '',
  'claim sync returns source identity and an owned lease token'
);

select pg_temp.expect_error(
  format(
    'select public.complete_data_source_sync(%L::uuid, %L, %L::jsonb, false)',
    current_setting('tinyops.source_id'),
    'wrong-lease-token',
    '{"folders":{"INBOX":{"lastUid":11}}}'
  ),
  'sync_lease_not_owned',
  'stale sync worker cannot complete another worker lease'
);

select public.complete_data_source_sync(
  current_setting('tinyops.source_id')::uuid,
  :'claimed_lease_token',
  '{"folders":{"INBOX":{"lastUid":11}}}'::jsonb,
  false
);

select pg_temp.assert_true(
  (
    select status = 'idle'
      and lease_owner is null
      and lease_expires_at is null
    from public.data_source_sync_states
    where source_id = current_setting('tinyops.source_id')::uuid
  ),
  'claim owner can complete sync and clear the lease'
);

reset role;
select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000203',
  'operator-ds@example.co'
);
set role authenticated;

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_sources
    where id = current_setting('tinyops.source_id')::uuid
  ),
  'operator can read data source metadata'
);

select pg_temp.expect_error(
  format(
    'select public.request_data_source_sync(%L::uuid, %L::uuid)',
    current_setting('tinyops.workspace_id'),
    current_setting('tinyops.source_id')
  ),
  'source_manage_forbidden',
  'operator cannot manage source sync'
);

reset role;
select pg_temp.as_user(
  '00000000-0000-4000-8000-000000000202',
  'admin-ds@example.co'
);
set role authenticated;

select public.disconnect_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  current_setting('tinyops.source_id')::uuid
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.data_sources
    where id = current_setting('tinyops.source_id')::uuid
      and disconnected_at is null
  ),
  'admin can disconnect data source'
);

reset role;
