create table public.data_source_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  trigger text not null,
  status text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  worker_id text,
  error_code text,
  error_message text,
  cause_message text,
  persisted_counts jsonb,
  cursor jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_source_sync_runs_status_valid check (
    status in ('running', 'succeeded', 'failed')
  ),
  constraint data_source_sync_runs_trigger_present check (
    btrim(trigger) <> ''
  )
);

alter table public.data_source_sync_runs enable row level security;

create trigger data_source_sync_runs_set_updated_at
  before update on public.data_source_sync_runs
  for each row
  execute function public.set_updated_at();

create index if not exists data_source_sync_runs_source_started_idx
  on public.data_source_sync_runs (source_id, started_at desc);

create index if not exists data_source_sync_runs_workspace_started_idx
  on public.data_source_sync_runs (workspace_id, started_at desc);

create policy "Members can read data source sync runs"
  on public.data_source_sync_runs
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

revoke all on public.data_source_sync_runs from anon, authenticated;
grant select on public.data_source_sync_runs to authenticated;
grant select, insert, update on public.data_source_sync_runs to service_role;

create unique index if not exists client_attributes_unique_source_attribute
  on public.client_attributes (client_id, raw_record_id, attribute_key)
  where raw_record_id is not null;

create or replace function public.ingest_client_connector_records(
  normalized_records jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item jsonb;
  v_participant_item jsonb;
  v_attribute_item jsonb;
  v_participants_json jsonb;
  v_attributes_json jsonb;
  v_record_workspace_id uuid;
  v_record_source_id uuid;
  v_record_external_id text;
  v_record_type text;
  v_record_event_type text;
  v_record_occurred_at timestamptz;
  v_record_title text;
  v_record_summary text;
  v_record_body_text text;
  v_record_sensitivity_level integer;
  v_raw_record_id uuid;
  v_persisted_client_id uuid;
  v_inserted_event_id uuid;
  v_external_email text;
  v_external_name text;
  v_slug_base text;
  v_slug_value text;
  v_attribute_key text;
  v_attribute_confidence numeric;
  v_clients_count integer := 0;
  v_raw_records_count integer := 0;
  v_timeline_events_count integer := 0;
begin
  if normalized_records is null
    or jsonb_typeof(normalized_records) <> 'array'
  then
    raise exception 'invalid_connector_records'
      using errcode = '22023';
  end if;

  for v_item in
    select value from jsonb_array_elements(normalized_records)
  loop
    v_record_workspace_id := nullif(v_item->>'workspaceId', '')::uuid;
    v_record_source_id := nullif(v_item->>'sourceId', '')::uuid;
    v_record_external_id := btrim(coalesce(v_item->>'externalId', ''));
    v_record_type := btrim(coalesce(v_item->>'recordType', ''));
    v_record_event_type := btrim(coalesce(v_item->>'eventType', ''));
    v_record_occurred_at := coalesce(
      nullif(v_item->>'occurredAt', '')::timestamptz,
      now()
    );
    v_record_title := btrim(coalesce(v_item->>'title', 'Imported event'));
    v_record_summary := btrim(coalesce(v_item->>'summary', ''));
    v_record_body_text := coalesce(v_item->>'bodyText', '');
    v_record_sensitivity_level := least(
      greatest(coalesce(nullif(v_item->>'sensitivityLevel', '')::integer, 0), 0),
      4
    );
    v_participants_json := case
      when jsonb_typeof(v_item->'participants') = 'array'
        then v_item->'participants'
      else '[]'::jsonb
    end;
    v_attributes_json := case
      when jsonb_typeof(v_item->'attributes') = 'array'
        then v_item->'attributes'
      else '[]'::jsonb
    end;

    if v_record_workspace_id is null
      or v_record_source_id is null
      or v_record_external_id = ''
      or v_record_type = ''
      or v_record_event_type = ''
      or v_record_title = ''
    then
      raise exception 'invalid_connector_records'
        using errcode = '22023';
    end if;

    insert into public.raw_source_records (
      workspace_id,
      source_id,
      external_id,
      record_type,
      raw_payload,
      body_text,
      content_hash,
      processed_at,
      processing_status
    )
    values (
      v_record_workspace_id,
      v_record_source_id,
      v_record_external_id,
      v_record_type,
      v_item,
      v_record_body_text,
      md5(concat(v_record_external_id, v_record_body_text, v_item::text)),
      now(),
      'processed'
    )
    on conflict (workspace_id, source_id, record_type, external_id) do update
      set raw_payload = excluded.raw_payload,
          body_text = excluded.body_text,
          content_hash = excluded.content_hash,
          processed_at = now(),
          processing_status = 'processed'
    returning id into v_raw_record_id;

    v_raw_records_count := v_raw_records_count + 1;

    for v_participant_item in
      select value from jsonb_array_elements(v_participants_json)
    loop
      v_external_email := lower(btrim(coalesce(v_participant_item->>'email', '')));
      v_external_name := nullif(
        btrim(coalesce(v_participant_item->>'name', '')),
        ''
      );

      if v_external_email = ''
        or position('@' in v_external_email) <= 1
        or v_participant_item->>'role' = 'owner'
      then
        continue;
      end if;

      v_slug_base := lower(coalesce(
        v_external_name,
        split_part(v_external_email, '@', 1)
      ));
      v_slug_base := trim(
        both '-' from regexp_replace(v_slug_base, '[^a-z0-9]+', '-', 'g')
      );
      if v_slug_base = '' then
        v_slug_base := 'client';
      end if;
      v_slug_value := concat(
        left(v_slug_base, 56),
        '-',
        left(md5(v_external_email), 8)
      );

      insert into public.clients (
        workspace_id,
        primary_email,
        display_name,
        slug,
        status,
        first_seen_at,
        last_seen_at,
        last_contacted_at,
        sensitivity_level
      )
      values (
        v_record_workspace_id,
        v_external_email,
        coalesce(v_external_name, v_external_email),
        v_slug_value,
        case when v_record_sensitivity_level >= 2 then 'sensitive' else 'active' end,
        v_record_occurred_at,
        v_record_occurred_at,
        case
          when v_record_event_type in ('email_received', 'email_sent')
            then v_record_occurred_at
          else null
        end,
        v_record_sensitivity_level
      )
      on conflict (workspace_id, primary_email) do update
        set display_name = case
              when btrim(public.clients.display_name) = ''
                then excluded.display_name
              else public.clients.display_name
            end,
            first_seen_at = least(
              coalesce(public.clients.first_seen_at, excluded.first_seen_at),
              excluded.first_seen_at
            ),
            last_seen_at = greatest(
              coalesce(public.clients.last_seen_at, excluded.last_seen_at),
              excluded.last_seen_at
            ),
            last_contacted_at = case
              when excluded.last_contacted_at is null
                then public.clients.last_contacted_at
              else greatest(
                coalesce(public.clients.last_contacted_at, excluded.last_contacted_at),
                excluded.last_contacted_at
              )
            end,
            sensitivity_level = greatest(
              public.clients.sensitivity_level,
              excluded.sensitivity_level
            ),
            status = case
              when public.clients.do_not_contact then 'dnc'
              when greatest(
                public.clients.sensitivity_level,
                excluded.sensitivity_level
              ) >= 2 then 'sensitive'
              else public.clients.status
            end
      returning id into v_persisted_client_id;

      v_clients_count := v_clients_count + 1;

      insert into public.client_identities (
        workspace_id,
        client_id,
        identity_type,
        identity_value,
        normalized_value,
        verified,
        source_id
      )
      values (
        v_record_workspace_id,
        v_persisted_client_id,
        'email',
        v_external_email,
        v_external_email,
        true,
        v_record_source_id
      )
      on conflict (workspace_id, identity_type, normalized_value) do update
        set client_id = excluded.client_id,
            source_id = excluded.source_id;

      v_inserted_event_id := null;
      insert into public.timeline_events (
        workspace_id,
        client_id,
        source_id,
        raw_record_id,
        event_type,
        event_date,
        title,
        summary,
        body_text,
        participants,
        metadata,
        sensitivity_level,
        ai_extracted_fields
      )
      values (
        v_record_workspace_id,
        v_persisted_client_id,
        v_record_source_id,
        v_raw_record_id,
        v_record_event_type,
        v_record_occurred_at,
        v_record_title,
        v_record_summary,
        v_record_body_text,
        v_participants_json,
        coalesce(v_item->'metadata', '{}'::jsonb),
        v_record_sensitivity_level,
        jsonb_build_object('attributes', v_attributes_json)
      )
      on conflict do nothing
      returning id into v_inserted_event_id;

      if v_inserted_event_id is not null then
        v_timeline_events_count := v_timeline_events_count + 1;
      end if;

      for v_attribute_item in
        select value from jsonb_array_elements(v_attributes_json)
      loop
        v_attribute_key := btrim(coalesce(v_attribute_item->>'key', ''));
        if v_attribute_key = '' then
          continue;
        end if;

        v_attribute_confidence := least(
          greatest(
            coalesce(nullif(v_attribute_item->>'confidence', '')::numeric, 1),
            0
          ),
          1
        );

        insert into public.client_attributes (
          workspace_id,
          client_id,
          source_id,
          raw_record_id,
          attribute_key,
          attribute_value,
          confidence
        )
        values (
          v_record_workspace_id,
          v_persisted_client_id,
          v_record_source_id,
          v_raw_record_id,
          v_attribute_key,
          coalesce(v_attribute_item->'value', 'null'::jsonb),
          v_attribute_confidence
        )
        on conflict (client_id, raw_record_id, attribute_key)
          where raw_record_id is not null
        do update
          set attribute_value = excluded.attribute_value,
              confidence = excluded.confidence;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object(
    'clients', v_clients_count,
    'rawRecords', v_raw_records_count,
    'timelineEvents', v_timeline_events_count
  );
end;
$$;

grant execute on function public.ingest_client_connector_records(jsonb)
  to service_role;
revoke execute on function public.ingest_client_connector_records(jsonb)
  from anon, authenticated, public;
