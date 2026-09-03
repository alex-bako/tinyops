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

select pg_temp.assert_true(
  to_regprocedure('public.normalize_data_source_display_name(text)') is not null,
  'data source display name helper exists'
);

select pg_temp.assert_true(
  to_regprocedure('public.require_data_source_slug(text)') is not null,
  'data source slug helper exists'
);

select pg_temp.assert_true(
  to_regprocedure('public.normalized_text_array(text[],text[])') is not null,
  'text array normalization helper exists'
);

select pg_temp.assert_true(
  to_regprocedure('public.require_unique_data_source_name(uuid,text,text,text,uuid)') is not null,
  'data source name uniqueness helper exists'
);

select pg_temp.assert_true(
  to_regprocedure('public.require_unique_imap_source_config(uuid,text,integer,text,text,uuid)') is not null,
  'IMAP config uniqueness helper exists'
);

select pg_temp.assert_true(
  to_regprocedure('public.require_unique_google_forms_source_config(uuid,text,text,uuid)') is not null,
  'Google Forms config uniqueness helper exists'
);

select pg_temp.assert_true(
  public.normalize_data_source_display_name('  Primary inbox  ') = 'Primary inbox',
  'display name helper trims values'
);

select pg_temp.assert_true(
  public.normalized_text_array(
    array[' INBOX ', '', 'Clients']::text[],
    array['Fallback']::text[]
  ) = array['INBOX', 'Clients']::text[],
  'text array helper trims and removes blanks'
);

select pg_temp.assert_true(
  public.normalized_text_array(array[' ']::text[], array['INBOX']::text[]) =
    array['INBOX']::text[],
  'text array helper uses fallback when empty'
);

select pg_temp.expect_error(
  'select public.require_data_source_slug(''new'')',
  'invalid_data_source_name',
  'reserved data source slug helper'
);

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
    'select public.connect_imap_data_source(%L::uuid, %L, %L, %L, %L, %L, %L, %L, %L::text[], %L::text[], %L::jsonb, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    'Broken mailbox',
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
    'select public.connect_imap_data_source(%L::uuid, %L, %L, %L, %L, %L, %L, %L, %L::text[], %L::text[], %L::jsonb, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    'Broken filters',
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
  ' Primary inbox ',
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
    and display_name = 'Primary inbox'
    and slug = 'primary-inbox'
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

select public.connect_imap_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  'Support inbox',
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
) as source_id_2 \gset

select pg_temp.assert_true(
  :'source_id_2'::uuid <> current_setting('tinyops.source_id')::uuid,
  'second connect creates another active IMAP source'
);

select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.data_sources
    where workspace_id = current_setting('tinyops.workspace_id')::uuid
      and source_type = 'imap'
      and disconnected_at is null
  ),
  'workspace can connect multiple IMAP sources'
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
  'Primary inbox',
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
      and history_window = '12mo'
      and watched_folders = array['INBOX', 'Clients']::text[]
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

select pg_temp.assert_true(
  public.request_all_data_source_syncs(
    current_setting('tinyops.workspace_id')::uuid
  ) = 2,
  'admin can request sync for all configured data sources'
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
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'data_source_sync_states'
      and column_name = 'history_window'
  ),
  'generic sync state has no source-specific history window'
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

select pg_temp.expect_error(
  format(
    'select public.request_all_data_source_syncs(%L::uuid)',
    current_setting('tinyops.workspace_id')
  ),
  'source_manage_forbidden',
  'operator cannot manage all source syncs'
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

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_manual_csv_data_source(%L::uuid, %L, %L, %L, %L::jsonb, %L, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    '',
    'manual_csv',
    'Practice intake',
    '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}',
    'practice-intake.csv',
    '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-10T09:15:00.000Z","Email Address":"anna@example.com"}}]'
  ),
  'invalid_google_forms_csv_mapping',
  'invalid Google Forms CSV config'
);

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_manual_csv_data_source(%L::uuid, %L, %L, %L, %L::jsonb, %L, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    '1InvalidRows',
    'manual_csv',
    'Invalid rows',
    '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}',
    'invalid.csv',
    '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-10T09:15:00.000Z"}}]'
  ),
  'invalid_google_forms_csv_mapping',
  'Google Forms CSV rejects missing mapped identity column'
);

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_manual_csv_data_source(%L::uuid, %L, %L, %L, %L::jsonb, %L, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    '1InvalidRows',
    'manual_csv',
    'Invalid rows',
    '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}',
    'invalid.csv',
    '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-10T09:15:00.000Z","Email Address":"not-an-email"}}]'
  ),
  'invalid_google_forms_csv_mapping',
  'Google Forms CSV rejects invalid email'
);

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_manual_csv_data_source(%L::uuid, %L, %L, %L, %L::jsonb, %L, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    '1InvalidRows',
    'manual_csv',
    'Invalid rows',
    '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}',
    'invalid.csv',
    '[{"rowNumber":2,"payload":{"Timestamp":"not-a-date","Email Address":"anna@example.com"}}]'
  ),
  'invalid_google_forms_csv_mapping',
  'Google Forms CSV rejects invalid timestamp'
);

select public.connect_google_forms_manual_csv_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  '1AbC_Def-1234567890',
  'manual_csv',
  'Practice intake',
  '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}'::jsonb,
  'practice-intake.csv',
  '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-10T09:15:00.000Z","Email Address":"anna@example.com","Full name":"Anna Smith"}}]'::jsonb
) as forms_source_id \gset

select public.connect_google_forms_manual_csv_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  '1Monthly_CheckIn',
  'manual_csv',
  'Monthly check-in',
  '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}'::jsonb,
  'monthly.csv',
  '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-11T09:15:00.000Z","Email Address":"priya@example.com"}}]'::jsonb
) as forms_source_id_2 \gset

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_manual_csv_data_source(%L::uuid, %L, %L, %L, %L::jsonb, %L, %L::jsonb)',
    current_setting('tinyops.workspace_id'),
    '1AbC_Def-1234567890',
    'manual_csv',
    'Practice intake copy',
    '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}',
    'practice-intake-reupload.csv',
    '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-12T09:15:00.000Z","Email Address":"mika@example.com"}}]'
  ),
  'duplicate_data_source_config',
  'Google Forms duplicate external form and mode is rejected'
);

select public.update_google_forms_manual_csv_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  :'forms_source_id'::uuid,
  'Practice intake',
  '{"identityColumn":"Email Address","timestampColumn":"Timestamp"}'::jsonb,
  'practice-intake-reupload.csv',
  '[{"rowNumber":2,"payload":{"Timestamp":"2026-05-12T09:15:00.000Z","Email Address":"mika@example.com"}}]'::jsonb
);

select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.data_sources
    where workspace_id = current_setting('tinyops.workspace_id')::uuid
      and source_type = 'forms'
      and disconnected_at is null
  ),
  'workspace can connect multiple Google Forms manual CSV sources'
);

select public.connect_google_forms_manual_csv_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  '1Dotted_Timestamp',
  'manual_csv',
  'Dotted timestamp',
  '{"identityColumn":"Email Address","timestampColumn":"Időbélyeg"}'::jsonb,
  'dotted-timestamp.csv',
  '[{"rowNumber":2,"payload":{"Időbélyeg":"2026.01.14. 19:22:08","Email Address":"anna@example.com"}}]'::jsonb
) as forms_source_id_3 \gset

select pg_temp.assert_true(
  (
    select config->>'externalFormId' = '1AbC_Def-1234567890'
      and config->>'connectionMode' = 'manual_csv'
      and config->'mapping'->>'identityColumn' = 'Email Address'
      and config->'latestUpload'->>'fileName' = 'practice-intake-reupload.csv'
    from public.data_sources
    where id = :'forms_source_id'::uuid
  ),
  'Google Forms source stores mode, mapping, and latest upload metadata'
);

select public.connect_google_forms_api_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  '1AbC_Def-1234567890',
  'Practice intake live',
  'q_email'
) as forms_api_source_id \gset

select pg_temp.assert_true(
  (
    select config->>'externalFormId' = '1AbC_Def-1234567890'
      and config->>'connectionMode' = 'api'
      and config->>'identityQuestionId' = 'q_email'
      and not (config ? 'mapping')
    from public.data_sources
    where id = :'forms_api_source_id'::uuid
  ),
  'Google Forms live source stores api mode and identity question beside the CSV source for the same form'
);

select pg_temp.assert_true(
  (
    select status = 'queued' and cursor is null
    from public.data_source_sync_states
    where source_id = :'forms_api_source_id'::uuid
  ),
  'Google Forms live source queues a full backfill on connect'
);

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_api_data_source(%L::uuid, %L, %L, %L)',
    current_setting('tinyops.workspace_id'),
    '1AbC_Def-1234567890',
    'Practice intake live copy',
    ''
  ),
  'duplicate_data_source_config',
  'Google Forms live duplicate external form is rejected'
);

select pg_temp.expect_error(
  format(
    'select public.connect_google_forms_api_data_source(%L::uuid, %L, %L, %L)',
    current_setting('tinyops.workspace_id'),
    '',
    'Empty live form',
    ''
  ),
  'invalid_google_form_id',
  'Google Forms live rejects an empty form id'
);

select public.connect_google_forms_api_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  '1Collected_Email_Form',
  'Collected email live',
  '   '
) as forms_api_collected_source_id \gset

select pg_temp.assert_true(
  (
    select config->>'identityQuestionId' is null
    from public.data_sources
    where id = :'forms_api_collected_source_id'::uuid
  ),
  'Google Forms live stores a null identity question when the form collects emails'
);

select pg_temp.assert_true(
  (
    select count(*) = 4
    from public.google_forms_csv_uploads
    where workspace_id = current_setting('tinyops.workspace_id')::uuid
  ),
  'Google Forms CSV uploads are stored as upload batches'
);

-- Stripe ------------------------------------------------------------------

select public.connect_stripe_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  'Shop billing',
  'acct_123',
  'sk_live_topsecret',
  '2026-01-01T00:00:00Z'::timestamptz
) as stripe_source_id \gset

select pg_temp.assert_true(
  (
    select source_type = 'stripe'
      and status = 'connected'
      and config->>'accountId' = 'acct_123'
      and (config->>'livemode')::boolean
      and (config->>'syncFrom')::timestamptz = '2026-01-01T00:00:00Z'::timestamptz
    from public.data_sources
    where id = :'stripe_source_id'::uuid
  ),
  'Stripe source stores account id, live mode, and sync start'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.data_source_secrets
    where source_id = :'stripe_source_id'::uuid
      and purpose = 'stripe_api_key'
      and masked_value = '****cret'
      and replaced_at is null
  ),
  'Stripe secret key is stored through Vault with masked metadata'
);

select pg_temp.assert_true(
  (
    select status = 'queued' and cursor is null
    from public.data_source_sync_states
    where source_id = :'stripe_source_id'::uuid
  ),
  'Stripe source queues a full backfill on connect'
);

select pg_temp.expect_error(
  format(
    'select public.connect_stripe_data_source(%L::uuid, %L, %L, %L, %L::timestamptz)',
    current_setting('tinyops.workspace_id'),
    'Shop billing copy',
    'acct_123',
    'sk_live_other',
    '2026-01-01T00:00:00Z'
  ),
  'duplicate_data_source_config',
  'Stripe duplicate account is rejected'
);

select pg_temp.expect_error(
  format(
    'select public.connect_stripe_data_source(%L::uuid, %L, %L, %L, %L::timestamptz)',
    current_setting('tinyops.workspace_id'),
    'Empty key',
    'acct_456',
    '',
    '2026-01-01T00:00:00Z'
  ),
  'invalid_stripe_config',
  'Stripe rejects an empty API key'
);

select pg_temp.expect_error(
  format(
    'select public.read_stripe_data_source_api_key(%L::uuid, %L::uuid)',
    current_setting('tinyops.workspace_id'),
    :'stripe_source_id'
  ),
  'permission denied for function read_stripe_data_source_api_key',
  'Stripe API key reader is not callable by authenticated users'
);

reset role;
set role service_role;

select pg_temp.assert_true(
  (
    select public.read_stripe_data_source_api_key(
      current_setting('tinyops.workspace_id')::uuid,
      :'stripe_source_id'::uuid
    ) = 'sk_live_topsecret'
  ),
  'service role can read the Stripe API key for sync'
);

select pg_temp.assert_true(
  (
    select count(*) = 4
    from public.google_forms_csv_rows
    where workspace_id = current_setting('tinyops.workspace_id')::uuid
  ),
  'Google Forms CSV response rows are available to the sync worker'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.google_forms_csv_rows
    where source_id = :'forms_source_id'::uuid
      and response_key = 'manual_csv:1AbC_Def-1234567890:2026-05-12T09:15:00.000Z:mika@example.com'
  ),
  'Google Forms CSV response key is derived in the database'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.google_forms_csv_rows
    where source_id = :'forms_source_id_3'::uuid
      and response_key = 'manual_csv:1Dotted_Timestamp:2026-01-14T19:22:08.000Z:anna@example.com'
  ),
  'Google Forms CSV response key supports dotted export timestamps'
);

reset role;
