-- Contract test for the Gmail data-source RPCs (connect / read token / rotate).
-- Runs inside a transaction and rolls back, so it leaves no residue.
-- Run: pnpm supabase:test:gmail-rpc (requires `supabase start`).
\set ON_ERROR_STOP on
begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-0000000009a1',
  'authenticated', 'authenticated', 'gmail-owner@example.co', '',
  now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, now(), now()
);
insert into public.profiles (id, email)
values ('00000000-0000-4000-8000-0000000009a1', 'gmail-owner@example.co');

select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-0000000009a1', false);
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-4000-8000-0000000009a1","email":"gmail-owner@example.co","role":"authenticated"}', false);
set role authenticated;

select public.create_personal_workspace(
  'Gmail RPC Workspace', 'gmail-rpc-owner', 'gmail-owner@example.co'
) as workspace_id \gset
reset role;
select set_config('tinyops.workspace_id', :'workspace_id', false);

-- reject invalid config (bad email)
set role authenticated;
do $$
begin
  begin
    perform public.connect_gmail_data_source(
      current_setting('tinyops.workspace_id')::uuid,
      'Bad Gmail', 'not-an-email', 'refresh-token-1', '12mo',
      array['INBOX','SENT']::text[], array[]::text[],
      '{"mode":"and","rules":[]}'::jsonb, '[]'::jsonb);
    raise exception 'FAIL: expected invalid_gmail_config';
  exception when sqlstate '22023' then
    raise notice 'OK: invalid email rejected';
  end;
end $$;

-- connect (initial)
select public.connect_gmail_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  ' Primary Gmail ', '  Owner@Gmail.com ', 'refresh-token-1', '90d',
  array[' INBOX ', 'SENT', ''], array[' *@noreply.* ', ''],
  '{"mode":"and","rules":[{"id":"r1","field":"from","operator":"contains","value":"acme"}]}'::jsonb,
  '[{"path":"INBOX","messages":10},{"path":"SENT","messages":3}]'::jsonb
) as source_id \gset
reset role;
select set_config('tinyops.source_id', :'source_id', false);

do $$
declare
  cnt int; labels text[]; secret_count int;
begin
  select count(*) into cnt from public.data_sources
  where id = current_setting('tinyops.source_id')::uuid
    and source_type = 'gmail' and status = 'connected'
    and config->>'emailAddress' = 'owner@gmail.com';
  assert cnt = 1, 'expected 1 connected gmail source with normalized email';

  select watched_folders into labels from public.data_source_intake_configs
  where source_id = current_setting('tinyops.source_id')::uuid;
  assert labels = array['INBOX','SENT']::text[], 'expected trimmed watched labels';

  select count(*) into secret_count from public.data_source_secrets
  where source_id = current_setting('tinyops.source_id')::uuid
    and purpose = 'gmail_oauth_refresh_token' and replaced_at is null;
  assert secret_count = 1, 'expected 1 active refresh-token secret';

  assert exists(select 1 from public.data_source_sync_states
    where source_id = current_setting('tinyops.source_id')::uuid and status = 'queued'),
    'expected queued sync state';
  raise notice 'OK: initial connect persisted source, intake, secret, sync state';
end $$;

-- service role can read the refresh token back
set role service_role;
do $$
declare tok text;
begin
  select public.read_gmail_data_source_refresh_token(
    current_setting('tinyops.workspace_id')::uuid,
    current_setting('tinyops.source_id')::uuid) into tok;
  assert tok = 'refresh-token-1', 'expected to decrypt the stored refresh token';
  raise notice 'OK: service role decrypted refresh token';
end $$;
reset role;

-- reconnect same account rotates token in place (same source id)
set role authenticated;
select public.connect_gmail_data_source(
  current_setting('tinyops.workspace_id')::uuid,
  'Primary Gmail', 'owner@gmail.com', 'refresh-token-2', '90d',
  array['INBOX','SENT']::text[], array[]::text[],
  '{"mode":"and","rules":[]}'::jsonb, '[]'::jsonb
) as source_id_2 \gset
reset role;
select set_config('tinyops.source_id_2', :'source_id_2', false);

do $$
declare active_count int;
begin
  assert current_setting('tinyops.source_id_2') = current_setting('tinyops.source_id'),
    'expected reconnect to return the same source id';
  select count(*) into active_count from public.data_source_secrets
  where source_id = current_setting('tinyops.source_id')::uuid
    and purpose = 'gmail_oauth_refresh_token' and replaced_at is null;
  assert active_count = 1, 'expected exactly one active secret after rotation';
  raise notice 'OK: reconnect rotated token on the same source';
end $$;

set role service_role;
do $$
declare tok text;
begin
  select public.read_gmail_data_source_refresh_token(
    current_setting('tinyops.workspace_id')::uuid,
    current_setting('tinyops.source_id')::uuid) into tok;
  assert tok = 'refresh-token-2', 'expected rotated token after reconnect';

  -- rotate write-back path
  perform public.rotate_gmail_data_source_refresh_token(
    current_setting('tinyops.workspace_id')::uuid,
    current_setting('tinyops.source_id')::uuid, 'refresh-token-3');
  select public.read_gmail_data_source_refresh_token(
    current_setting('tinyops.workspace_id')::uuid,
    current_setting('tinyops.source_id')::uuid) into tok;
  assert tok = 'refresh-token-3', 'expected rotate RPC to replace token';
  raise notice 'OK: rotate write-back replaced token';
end $$;
reset role;

rollback;
