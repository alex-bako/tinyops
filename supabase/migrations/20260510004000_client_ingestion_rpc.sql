create unique index client_attributes_unique_source_attribute
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
  item jsonb;
  participant_item jsonb;
  attribute_item jsonb;
  participants_json jsonb;
  attributes_json jsonb;
  record_workspace_id uuid;
  record_source_id uuid;
  record_external_id text;
  record_type text;
  record_event_type text;
  record_occurred_at timestamptz;
  record_title text;
  record_summary text;
  record_body_text text;
  record_sensitivity_level integer;
  raw_record_id uuid;
  persisted_client_id uuid;
  inserted_event_id uuid;
  external_email text;
  external_name text;
  slug_base text;
  slug_value text;
  attribute_key text;
  attribute_confidence numeric;
  clients_count integer := 0;
  raw_records_count integer := 0;
  timeline_events_count integer := 0;
begin
  if normalized_records is null
    or jsonb_typeof(normalized_records) <> 'array'
  then
    raise exception 'invalid_connector_records'
      using errcode = '22023';
  end if;

  for item in
    select value from jsonb_array_elements(normalized_records)
  loop
    record_workspace_id := nullif(item->>'workspaceId', '')::uuid;
    record_source_id := nullif(item->>'sourceId', '')::uuid;
    record_external_id := btrim(coalesce(item->>'externalId', ''));
    record_type := btrim(coalesce(item->>'recordType', ''));
    record_event_type := btrim(coalesce(item->>'eventType', ''));
    record_occurred_at := coalesce(
      nullif(item->>'occurredAt', '')::timestamptz,
      now()
    );
    record_title := btrim(coalesce(item->>'title', 'Imported event'));
    record_summary := btrim(coalesce(item->>'summary', ''));
    record_body_text := coalesce(item->>'bodyText', '');
    record_sensitivity_level := least(
      greatest(coalesce(nullif(item->>'sensitivityLevel', '')::integer, 0), 0),
      4
    );
    participants_json := case
      when jsonb_typeof(item->'participants') = 'array'
        then item->'participants'
      else '[]'::jsonb
    end;
    attributes_json := case
      when jsonb_typeof(item->'attributes') = 'array'
        then item->'attributes'
      else '[]'::jsonb
    end;

    if record_workspace_id is null
      or record_source_id is null
      or record_external_id = ''
      or record_type = ''
      or record_event_type = ''
      or record_title = ''
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
      record_workspace_id,
      record_source_id,
      record_external_id,
      record_type,
      item,
      record_body_text,
      md5(concat(record_external_id, record_body_text, item::text)),
      now(),
      'processed'
    )
    on conflict (workspace_id, source_id, record_type, external_id) do update
      set raw_payload = excluded.raw_payload,
          body_text = excluded.body_text,
          content_hash = excluded.content_hash,
          processed_at = now(),
          processing_status = 'processed'
    returning id into raw_record_id;

    raw_records_count := raw_records_count + 1;

    for participant_item in
      select value from jsonb_array_elements(participants_json)
    loop
      external_email := lower(btrim(coalesce(participant_item->>'email', '')));
      external_name := nullif(btrim(coalesce(participant_item->>'name', '')), '');

      if external_email = ''
        or position('@' in external_email) <= 1
        or participant_item->>'role' = 'owner'
      then
        continue;
      end if;

      slug_base := lower(coalesce(external_name, split_part(external_email, '@', 1)));
      slug_base := trim(both '-' from regexp_replace(slug_base, '[^a-z0-9]+', '-', 'g'));
      if slug_base = '' then
        slug_base := 'client';
      end if;
      slug_value := concat(left(slug_base, 56), '-', left(md5(external_email), 8));

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
        record_workspace_id,
        external_email,
        coalesce(external_name, external_email),
        slug_value,
        case when record_sensitivity_level >= 2 then 'sensitive' else 'active' end,
        record_occurred_at,
        record_occurred_at,
        case
          when record_event_type in ('email_received', 'email_sent')
            then record_occurred_at
          else null
        end,
        record_sensitivity_level
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
      returning id into persisted_client_id;

      clients_count := clients_count + 1;

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
        record_workspace_id,
        persisted_client_id,
        'email',
        external_email,
        external_email,
        true,
        record_source_id
      )
      on conflict (workspace_id, identity_type, normalized_value) do update
        set client_id = excluded.client_id,
            source_id = excluded.source_id;

      inserted_event_id := null;
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
        record_workspace_id,
        persisted_client_id,
        record_source_id,
        raw_record_id,
        record_event_type,
        record_occurred_at,
        record_title,
        record_summary,
        record_body_text,
        participants_json,
        coalesce(item->'metadata', '{}'::jsonb),
        record_sensitivity_level,
        jsonb_build_object('attributes', attributes_json)
      )
      on conflict do nothing
      returning id into inserted_event_id;

      if inserted_event_id is not null then
        timeline_events_count := timeline_events_count + 1;
      end if;

      for attribute_item in
        select value from jsonb_array_elements(attributes_json)
      loop
        attribute_key := btrim(coalesce(attribute_item->>'key', ''));
        if attribute_key = '' then
          continue;
        end if;

        attribute_confidence := least(
          greatest(coalesce(nullif(attribute_item->>'confidence', '')::numeric, 1), 0),
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
          record_workspace_id,
          persisted_client_id,
          record_source_id,
          raw_record_id,
          attribute_key,
          coalesce(attribute_item->'value', 'null'::jsonb),
          attribute_confidence
        )
        on conflict (client_id, raw_record_id, attribute_key) where raw_record_id is not null
        do update
          set attribute_value = excluded.attribute_value,
              confidence = excluded.confidence;
      end loop;
    end loop;
  end loop;

  return jsonb_build_object(
    'clients', clients_count,
    'rawRecords', raw_records_count,
    'timelineEvents', timeline_events_count
  );
end;
$$;

grant execute on function public.ingest_client_connector_records(jsonb)
  to service_role;
revoke execute on function public.ingest_client_connector_records(jsonb)
  from anon, authenticated, public;
