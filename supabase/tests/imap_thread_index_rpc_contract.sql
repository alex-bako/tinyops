\set ON_ERROR_STOP on

reset role;

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
where handle = 'imap-thread-index-rpc';

delete from auth.users
where id = '00000000-0000-4000-8000-000000000401';

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
  '00000000-0000-4000-8000-000000000401',
  'authenticated',
  'authenticated',
  'imap-thread-owner@example.co',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.profiles (id, email)
values (
  '00000000-0000-4000-8000-000000000401',
  'imap-thread-owner@example.co'
);

insert into public.workspaces (
  name,
  handle,
  created_by
)
values (
  'IMAP Thread Index RPC Workspace',
  'imap-thread-index-rpc',
  '00000000-0000-4000-8000-000000000401'
)
returning id as workspace_id \gset

insert into public.data_sources (
  workspace_id,
  source_type,
  display_name,
  slug,
  status,
  config
)
values (
  :'workspace_id',
  'imap',
  'IMAP mailbox',
  'imap-mailbox',
  'connected',
  '{"host":"imap.example.com","port":993,"encryption":"ssl","username":"owner@example.com"}'::jsonb
)
returning id as source_id \gset

insert into public.data_source_sync_states (
  source_id,
  status
)
values (
  :'source_id',
  'idle'
);

set role service_role;

insert into public.raw_source_records (
  workspace_id,
  source_id,
  external_id,
  record_type,
  raw_payload,
  body_text,
  content_hash,
  processing_status,
  processed_at
)
values
(
  :'workspace_id',
  :'source_id',
  'message:<reply@example.com>',
  'email',
  jsonb_build_object(
    'metadata',
    jsonb_build_object(
      'imapThread',
      jsonb_build_object(
        'relatedMessageIds',
        jsonb_build_array('<Reply@Example.COM>', '<Root@Example.COM>')
      )
    )
  ),
  '',
  'thread-current',
  'processed',
  now()
),
(
  :'workspace_id',
  :'source_id',
  'message:<legacy@example.com>',
  'email',
  jsonb_build_object(
    'metadata',
    jsonb_build_object('messageId', '<Legacy@Example.COM>')
  ),
  '',
  'thread-legacy',
  'processed',
  now()
);

select public.read_imap_thread_message_ids(:'workspace_id', :'source_id') as thread_ids \gset

select pg_temp.assert_true(
  :'thread_ids'::text[] @> array[
    '<reply@example.com>',
    '<root@example.com>',
    '<legacy@example.com>'
  ],
  'thread index RPC returns normalized current and legacy message IDs'
);

set role authenticated;

select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.read_imap_thread_message_ids(uuid, uuid)',
    'execute'
  ),
  'thread index RPC is not executable by authenticated users'
);

select pg_temp.assert_true(
  not has_function_privilege(
    'anon',
    'public.read_imap_thread_message_ids(uuid, uuid)',
    'execute'
  ),
  'thread index RPC is not executable by anonymous users'
);

select pg_temp.assert_true(
  has_function_privilege(
    'service_role',
    'public.read_imap_thread_message_ids(uuid, uuid)',
    'execute'
  ),
  'thread index RPC is executable by service role'
);
