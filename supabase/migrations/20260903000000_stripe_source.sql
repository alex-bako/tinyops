-- Stripe source: a workspace connects one Stripe account with a secret API
-- key stored in Vault. The sync worker polls the Stripe API on the cron
-- cadence; charges, refunds, disputes, invoices and subscriptions become
-- `payment` timeline events and customers become client identities.

alter table public.data_source_secrets
  drop constraint if exists data_source_secrets_purpose_valid;

alter table public.data_source_secrets
  add constraint data_source_secrets_purpose_valid check (
    purpose in ('imap_password', 'stripe_api_key')
  );

alter table public.timeline_events
  drop constraint if exists timeline_events_event_type_valid;

alter table public.timeline_events
  add constraint timeline_events_event_type_valid check (
    event_type in (
      'email_received',
      'email_sent',
      'form_submission',
      'csv_import_row',
      'manual_note',
      'tinyops_email',
      'system_event',
      'payment'
    )
  );

create unique index if not exists data_sources_one_active_stripe_account
  on public.data_sources (workspace_id, (config->>'accountId'))
  where source_type = 'stripe'
    and disconnected_at is null;

create or replace function public.connect_stripe_data_source(
  target_workspace_id uuid,
  stripe_display_name text,
  stripe_account_id text,
  stripe_api_key text,
  stripe_sync_from timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  normalized_account_id text;
  normalized_display_name text;
  normalized_slug text;
  connected_source_id uuid;
  secret_name text;
  secret_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  actor_role := public.workspace_actor_role(target_workspace_id);
  if actor_role not in ('owner', 'admin') then
    raise exception 'source_manage_forbidden'
      using errcode = '42501';
  end if;

  normalized_account_id := btrim(coalesce(stripe_account_id, ''));
  normalized_display_name := public.normalize_data_source_display_name(
    stripe_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);

  if normalized_account_id = '' or btrim(coalesce(stripe_api_key, '')) = '' then
    raise exception 'invalid_stripe_config'
      using errcode = '22023';
  end if;

  perform public.require_unique_data_source_name(
    target_workspace_id,
    'stripe',
    normalized_display_name,
    normalized_slug,
    null
  );

  if exists (
    select 1
    from public.data_sources source
    where source.workspace_id = target_workspace_id
      and source.source_type = 'stripe'
      and source.disconnected_at is null
      and source.config->>'accountId' = normalized_account_id
  ) then
    raise exception 'duplicate_data_source_config'
      using errcode = '23505';
  end if;

  insert into public.data_sources (
    workspace_id,
    source_type,
    slug,
    display_name,
    status,
    config_version,
    config,
    connected_at,
    last_verified_at
  )
  values (
    target_workspace_id,
    'stripe',
    normalized_slug,
    normalized_display_name,
    'connected',
    1,
    jsonb_build_object(
      'accountId', normalized_account_id,
      'syncFrom', stripe_sync_from,
      'livemode', left(btrim(stripe_api_key), 8) = 'sk_live_'
    ),
    now(),
    now()
  )
  returning id into connected_source_id;

  secret_name := concat(
    'tinyops:data-source:',
    connected_source_id::text,
    ':stripe_api_key:',
    gen_random_uuid()::text
  );

  secret_id := vault.create_secret(
    stripe_api_key,
    secret_name,
    concat('Stripe API key for TinyOps data source ', connected_source_id::text)
  );

  insert into public.data_source_secrets (
    source_id,
    purpose,
    vault_secret_id,
    masked_value
  )
  values (
    connected_source_id,
    'stripe_api_key',
    secret_id,
    public.mask_secret_tail(stripe_api_key)
  );

  insert into public.data_source_sync_states (
    source_id,
    status,
    cursor,
    last_error,
    requested_at
  )
  values (
    connected_source_id,
    'queued',
    null,
    null,
    now()
  );

  return connected_source_id;
end;
$$;

grant execute on function public.connect_stripe_data_source(
  uuid,
  text,
  text,
  text,
  timestamptz
) to authenticated;

revoke execute on function public.connect_stripe_data_source(
  uuid,
  text,
  text,
  text,
  timestamptz
) from anon, public;

create or replace function public.read_stripe_data_source_api_key(
  target_workspace_id uuid,
  target_source_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_secret_id uuid;
  decrypted_key text;
begin
  if not exists (
    select 1
    from public.data_sources source
    where source.id = target_source_id
      and source.workspace_id = target_workspace_id
      and source.source_type = 'stripe'
      and source.status <> 'disconnected'
      and source.disconnected_at is null
  ) then
    raise exception 'source_not_found'
      using errcode = '42501';
  end if;

  select secret.vault_secret_id
  into active_secret_id
  from public.data_source_secrets secret
  where secret.source_id = target_source_id
    and secret.purpose = 'stripe_api_key'
    and secret.replaced_at is null
  order by secret.created_at desc
  limit 1;

  if active_secret_id is null then
    raise exception 'invalid_stripe_config'
      using errcode = '22023';
  end if;

  begin
    select decrypted.decrypted_secret
    into decrypted_key
    from vault.decrypted_secrets decrypted
    where decrypted.id = active_secret_id;
  exception
    when others then
      raise exception 'secret_read_failed'
        using errcode = 'XX000';
  end;

  if decrypted_key is null or btrim(decrypted_key) = '' then
    raise exception 'secret_read_failed'
      using errcode = 'XX000';
  end if;

  return decrypted_key;
end;
$$;

grant execute on function public.read_stripe_data_source_api_key(uuid, uuid)
  to service_role;
revoke execute on function public.read_stripe_data_source_api_key(uuid, uuid)
  from anon, authenticated, public;

-- Ingestion: records may now carry `identities` (external ids linked to the
-- matched client) and an empty `eventType`, which persists the raw record,
-- client, identities and attributes without a timeline event. Re-ingested
-- records update the existing timeline event in place.
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
  v_identity_item jsonb;
  v_participants_json jsonb;
  v_attributes_json jsonb;
  v_identities_json jsonb;
  v_record_workspace_id uuid;
  v_record_source_id uuid;
  v_record_external_id text;
  v_record_type text;
  v_record_event_type text;
  v_record_occurred_at timestamptz;
  v_record_body jsonb;
  v_record_body_text text;
  v_record_sensitivity_level integer;
  v_raw_record_id uuid;
  v_persisted_client_id uuid;
  v_event_inserted boolean;
  v_external_email text;
  v_external_name text;
  v_identity_value text;
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
    v_record_body := v_item->'body';
    v_record_body_text := coalesce(v_record_body->>'text', '');
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
    v_identities_json := case
      when jsonb_typeof(v_item->'identities') = 'array'
        then v_item->'identities'
      else '[]'::jsonb
    end;

    if v_record_workspace_id is null
      or v_record_source_id is null
      or v_record_external_id = ''
      or v_record_type = ''
      or not public.is_valid_timeline_event_body(v_record_body)
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

      v_slug_base := public.slugify_client_name(coalesce(
        v_external_name,
        split_part(v_external_email, '@', 1)
      ));
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

      for v_identity_item in
        select value from jsonb_array_elements(v_identities_json)
      loop
        v_identity_value := btrim(coalesce(v_identity_item->>'value', ''));
        if v_identity_value = ''
          or v_identity_item->>'type' <> 'external_id'
        then
          continue;
        end if;

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
          'external_id',
          v_identity_value,
          lower(v_identity_value),
          true,
          v_record_source_id
        )
        on conflict (workspace_id, identity_type, normalized_value) do update
          set client_id = excluded.client_id,
              source_id = excluded.source_id;
      end loop;

      if v_record_event_type <> '' then
        v_event_inserted := not exists (
          select 1
          from public.timeline_events existing
          where existing.client_id = v_persisted_client_id
            and existing.raw_record_id = v_raw_record_id
            and existing.event_type = v_record_event_type
        );

        insert into public.timeline_events (
          workspace_id,
          client_id,
          source_id,
          raw_record_id,
          event_type,
          event_date,
          body,
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
          v_record_body,
          v_participants_json,
          coalesce(v_item->'metadata', '{}'::jsonb),
          v_record_sensitivity_level,
          jsonb_build_object('attributes', v_attributes_json)
        )
        on conflict (client_id, raw_record_id, event_type)
          where raw_record_id is not null
        do update
          set event_date = excluded.event_date,
              body = excluded.body,
              participants = excluded.participants,
              metadata = excluded.metadata,
              sensitivity_level = excluded.sensitivity_level,
              ai_extracted_fields = excluded.ai_extracted_fields;

        if v_event_inserted then
          v_timeline_events_count := v_timeline_events_count + 1;
        end if;
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
