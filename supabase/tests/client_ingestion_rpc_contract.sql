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

create or replace function pg_temp.expect_error(
  sql text,
  expected_message text,
  label text
)
returns void
language plpgsql
as $$
begin
  execute sql;
  raise exception 'Assertion failed: % (expected error %)', label, expected_message;
exception
  when others then
    if sqlerrm <> expected_message then
      raise exception 'Assertion failed: % (expected %, got %)', label, expected_message, sqlerrm;
    end if;
end;
$$;

delete from public.workspaces
where handle = 'client-ingestion-rpc';

delete from auth.users
where id = '00000000-0000-4000-8000-000000000301';

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
  '00000000-0000-4000-8000-000000000301',
  'authenticated',
  'authenticated',
  'ingestion-owner@example.co',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

insert into public.profiles (id, email)
values (
  '00000000-0000-4000-8000-000000000301',
  'ingestion-owner@example.co'
);

insert into public.workspaces (
  name,
  handle,
  created_by
)
values (
  'Client Ingestion RPC Workspace',
  'client-ingestion-rpc',
  '00000000-0000-4000-8000-000000000301'
)
returning id as workspace_id \gset

insert into public.workspace_memberships (
  workspace_id,
  user_id,
  role
)
values (
  :'workspace_id',
  '00000000-0000-4000-8000-000000000301',
  'owner'
);

insert into public.data_sources (
  workspace_id,
  source_type,
  slug,
  display_name,
  status,
  config
)
values (
  :'workspace_id',
  'imap',
  'imap-mailbox',
  'IMAP mailbox',
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

select public.ingest_client_connector_records(
  jsonb_build_array(
    jsonb_build_object(
      'workspaceId', :'workspace_id',
      'sourceId', :'source_id',
      'sourceType', 'imap',
      'externalId', 'message:<m1@example.com>',
      'recordType', 'email',
      'eventType', 'email_received',
      'occurredAt', '2026-05-10T08:00:00.000Z',
      'body', jsonb_build_object(
        'text', 'Could you resend the replay link?',
        'blocks', jsonb_build_array(
          jsonb_build_object(
            'kind', 'text',
            'text', 'Could you resend the replay link?'
          )
        )
      ),
      'participants', jsonb_build_array(
        jsonb_build_object(
          'email', 'owner@example.com',
          'role', 'owner'
        ),
        jsonb_build_object(
          'email', 'client@example.com',
          'name', 'Client One',
          'role', 'external'
        )
      ),
      'metadata', jsonb_build_object('folder', 'INBOX'),
      'attributes', jsonb_build_array(
        jsonb_build_object(
          'key', 'record_type',
          'value', 'email',
          'confidence', 0.9
        ),
        jsonb_build_object(
          'key', 'attribute_key',
          'value', 'topic',
          'confidence', 0.8
        )
      ),
      'sensitivityLevel', 0
    )
  )
) as first_result \gset

select pg_temp.assert_true(
  :'first_result'::jsonb @> '{"clients":1,"rawRecords":1,"timelineEvents":1}'::jsonb,
  'first ingest persists normalized connector record'
);

select public.ingest_client_connector_records(
  jsonb_build_array(
    jsonb_build_object(
      'workspaceId', :'workspace_id',
      'sourceId', :'source_id',
      'sourceType', 'imap',
      'externalId', 'message:<m1@example.com>',
      'recordType', 'email',
      'eventType', 'email_received',
      'occurredAt', '2026-05-10T08:00:00.000Z',
      'body', jsonb_build_object(
        'text', 'Updated body',
        'blocks', jsonb_build_array(
          jsonb_build_object('kind', 'text', 'text', 'Updated body')
        )
      ),
      'participants', jsonb_build_array(
        jsonb_build_object(
          'email', 'client@example.com',
          'name', 'Client One',
          'role', 'external'
        )
      ),
      'metadata', '{}'::jsonb,
      'attributes', '[]'::jsonb,
      'sensitivityLevel', 0
    )
  )
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.raw_source_records
    where workspace_id = :'workspace_id'
      and source_id = :'source_id'
      and record_type = 'email'
      and external_id = 'message:<m1@example.com>'
      and body_text = 'Updated body'
  ),
  'duplicate external IDs upsert raw source records'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.timeline_events
    where workspace_id = :'workspace_id'
      and source_id = :'source_id'
      and event_type = 'email_received'
  ),
  'duplicate external IDs do not create duplicate timeline events'
);

select pg_temp.assert_true(
  (
    select body @> '{"text":"Updated body","blocks":[{"kind":"text","text":"Updated body"}]}'::jsonb
    from public.timeline_events
    where workspace_id = :'workspace_id'
      and source_id = :'source_id'
      and event_type = 'email_received'
  ),
  'timeline events store structured body and re-ingested records update it in place'
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.clients
    where workspace_id = :'workspace_id'
      and primary_email = 'owner@example.com'
  ),
  'owner participants are not persisted as clients'
);

select pg_temp.assert_true(
  (
    select count(*) = 2
    from public.client_attributes
    where workspace_id = :'workspace_id'
      and attribute_key in ('record_type', 'attribute_key')
  ),
  'connector attributes are persisted for the external client'
);

select public.ingest_client_connector_records(
  jsonb_build_array(
    jsonb_build_object(
      'workspaceId', :'workspace_id',
      'sourceId', :'source_id',
      'sourceType', 'imap',
      'externalId', 'message:<m2@example.com>',
      'recordType', 'email',
      'eventType', 'email_received',
      'occurredAt', '2026-05-11T08:00:00.000Z',
      'body', jsonb_build_object(
        'text', 'Sensitive context',
        'blocks', jsonb_build_array(
          jsonb_build_object('kind', 'text', 'text', 'Sensitive context')
        )
      ),
      'participants', jsonb_build_array(
        jsonb_build_object(
          'email', 'client@example.com',
          'name', 'Client One',
          'role', 'external'
        )
      ),
      'metadata', '{}'::jsonb,
      'attributes', '[]'::jsonb,
      'sensitivityLevel', 2
    )
  )
);

select pg_temp.assert_true(
  (
    select status = 'sensitive'
      and sensitivity_level = 2
    from public.clients
    where workspace_id = :'workspace_id'
      and primary_email = 'client@example.com'
  ),
  'sensitive connector records update the client status'
);

-- Identities and event-less records (Stripe customers) ------------------------

select public.ingest_client_connector_records(
  jsonb_build_array(
    jsonb_build_object(
      'workspaceId', :'workspace_id',
      'sourceId', :'source_id',
      'sourceType', 'stripe',
      'externalId', 'stripe:customer:cus_1',
      'recordType', 'stripe_customer',
      'eventType', null,
      'occurredAt', '2026-05-01T08:00:00.000Z',
      'body', jsonb_build_object('text', '', 'blocks', '[]'::jsonb),
      'participants', jsonb_build_array(
        jsonb_build_object('email', 'client@example.com', 'role', 'external')
      ),
      'identities', jsonb_build_array(
        jsonb_build_object('type', 'external_id', 'value', 'cus_1'),
        jsonb_build_object('type', 'phone', 'value', 'ignored')
      ),
      'metadata', '{}'::jsonb,
      'attributes', jsonb_build_array(
        jsonb_build_object('key', 'stripe_customer_id', 'value', 'cus_1', 'confidence', 1)
      ),
      'sensitivityLevel', 0
    )
  )
) as customer_result \gset

select pg_temp.assert_true(
  :'customer_result'::jsonb @> '{"clients":1,"rawRecords":1,"timelineEvents":0}'::jsonb,
  'event-less records persist without a timeline event'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.client_identities identity
    join public.clients client on client.id = identity.client_id
    where identity.workspace_id = :'workspace_id'
      and identity.identity_type = 'external_id'
      and identity.identity_value = 'cus_1'
      and client.primary_email = 'client@example.com'
  ),
  'external id identities are linked to the matched client'
);

select pg_temp.assert_true(
  (
    select count(*) = 0
    from public.client_identities
    where workspace_id = :'workspace_id'
      and identity_value = 'ignored'
  ),
  'unsupported identity types are ignored'
);

select public.ingest_client_connector_records(
  jsonb_build_array(
    jsonb_build_object(
      'workspaceId', :'workspace_id',
      'sourceId', :'source_id',
      'sourceType', 'stripe',
      'externalId', 'stripe:subscription:sub_1',
      'recordType', 'stripe_subscription',
      'eventType', 'payment',
      'occurredAt', '2026-05-02T08:00:00.000Z',
      'body', jsonb_build_object(
        'text', 'Status: active',
        'blocks', jsonb_build_array(
          jsonb_build_object('kind', 'qa', 'question', 'Status', 'answer', 'active')
        )
      ),
      'participants', jsonb_build_array(
        jsonb_build_object('email', 'client@example.com', 'role', 'external')
      ),
      'metadata', jsonb_build_object('status', 'active'),
      'attributes', '[]'::jsonb,
      'sensitivityLevel', 0
    )
  )
);

select public.ingest_client_connector_records(
  jsonb_build_array(
    jsonb_build_object(
      'workspaceId', :'workspace_id',
      'sourceId', :'source_id',
      'sourceType', 'stripe',
      'externalId', 'stripe:subscription:sub_1',
      'recordType', 'stripe_subscription',
      'eventType', 'payment',
      'occurredAt', '2026-05-09T08:00:00.000Z',
      'body', jsonb_build_object(
        'text', 'Status: canceled',
        'blocks', jsonb_build_array(
          jsonb_build_object('kind', 'qa', 'question', 'Status', 'answer', 'canceled')
        )
      ),
      'participants', jsonb_build_array(
        jsonb_build_object('email', 'client@example.com', 'role', 'external')
      ),
      'metadata', jsonb_build_object('status', 'canceled'),
      'attributes', '[]'::jsonb,
      'sensitivityLevel', 0
    )
  )
) as update_result \gset

select pg_temp.assert_true(
  :'update_result'::jsonb @> '{"timelineEvents":0}'::jsonb,
  're-ingesting a record does not count a new timeline event'
);

select pg_temp.assert_true(
  (
    select count(*) = 1
    from public.timeline_events event
    join public.raw_source_records raw on raw.id = event.raw_record_id
    where raw.external_id = 'stripe:subscription:sub_1'
      and event.event_type = 'payment'
      and event.metadata->>'status' = 'canceled'
      and event.event_date = '2026-05-09T08:00:00.000Z'::timestamptz
  ),
  're-ingested payment events are updated in place'
);

select pg_temp.expect_error(
  'select public.ingest_client_connector_records(''{}''::jsonb)',
  'invalid_connector_records',
  'ingestion RPC rejects non-array payloads'
);

select pg_temp.expect_error(
  'select public.ingest_client_connector_records(jsonb_build_array(jsonb_build_object(' ||
    quote_literal('workspaceId') || ', ' || quote_literal(:'workspace_id') || ', ' ||
    quote_literal('sourceId') || ', ' || quote_literal(:'source_id') || ', ' ||
    quote_literal('sourceType') || ', ' || quote_literal('forms') || ', ' ||
    quote_literal('externalId') || ', ' || quote_literal('forms:bad-body') || ', ' ||
    quote_literal('recordType') || ', ' || quote_literal('google_form_response') || ', ' ||
    quote_literal('eventType') || ', ' || quote_literal('form_submission') || ', ' ||
    quote_literal('occurredAt') || ', ' || quote_literal('2026-05-12T08:00:00.000Z') || ', ' ||
    quote_literal('body') || ', jsonb_build_object(' ||
      quote_literal('text') || ', ' || quote_literal('Goal') || ', ' ||
      quote_literal('blocks') || ', jsonb_build_array(jsonb_build_object(' ||
        quote_literal('kind') || ', ' || quote_literal('qa') || ', ' ||
        quote_literal('question') || ', ' || quote_literal('Goal') ||
      '))' ||
    '), ' ||
    quote_literal('participants') || ', jsonb_build_array(jsonb_build_object(' ||
      quote_literal('email') || ', ' || quote_literal('client@example.com') || ', ' ||
      quote_literal('role') || ', ' || quote_literal('external') ||
    ')), ' ||
    quote_literal('metadata') || ', ' || quote_literal('{}') || '::jsonb, ' ||
    quote_literal('attributes') || ', ' || quote_literal('[]') || '::jsonb, ' ||
    quote_literal('sensitivityLevel') || ', 0' ||
  ')))',
  'invalid_connector_records',
  'ingestion RPC rejects malformed Timeline Event body blocks'
);

reset role;
