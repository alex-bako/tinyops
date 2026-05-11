drop function if exists public.is_valid_google_forms_csv_upload_rows(jsonb);

create or replace function public.google_forms_csv_response_email(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lower(btrim(coalesce(value, ''))) ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'
      then lower(btrim(coalesce(value, '')))
    else null
  end
$$;

create or replace function public.google_forms_csv_response_timestamp(value text)
returns timestamptz
language plpgsql
stable
set search_path = ''
as $$
declare
  parsed timestamptz;
begin
  parsed := nullif(btrim(coalesce(value, '')), '')::timestamptz;
  return parsed;
exception
  when others then
    return null;
end;
$$;

create or replace function public.google_forms_csv_response_key(
  form_external_id text,
  mapping jsonb,
  payload jsonb
)
returns text
language sql
stable
set search_path = ''
as $$
  select case
    when public.google_forms_csv_response_email(payload->>(mapping->>'identityColumn')) is null
      or public.google_forms_csv_response_timestamp(payload->>(mapping->>'timestampColumn')) is null
      then null
    else concat_ws(
      ':',
      'manual_csv',
      btrim(coalesce(form_external_id, '')),
      to_char(
        public.google_forms_csv_response_timestamp(payload->>(mapping->>'timestampColumn')) at time zone 'UTC',
        'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
      ),
      public.google_forms_csv_response_email(payload->>(mapping->>'identityColumn'))
    )
  end
$$;

create or replace function public.is_valid_google_forms_csv_upload_rows(
  rows jsonb,
  mapping jsonb
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select rows is not null
    and jsonb_typeof(rows) = 'array'
    and jsonb_array_length(rows) > 0
    and public.is_valid_google_forms_csv_mapping(mapping)
    and not exists (
      select 1
      from jsonb_array_elements(rows) as row(value)
      where jsonb_typeof(row.value) <> 'object'
        or jsonb_typeof(row.value->'rowNumber') <> 'number'
        or (row.value->>'rowNumber') !~ '^[0-9]+$'
        or (row.value->>'rowNumber')::integer < 1
        or jsonb_typeof(row.value->'payload') <> 'object'
        or not ((row.value->'payload') ? (mapping->>'identityColumn'))
        or not ((row.value->'payload') ? (mapping->>'timestampColumn'))
        or public.google_forms_csv_response_key(
          '',
          mapping,
          row.value->'payload'
        ) is null
    )
$$;

create or replace function public.connect_google_forms_manual_csv_data_source(
  target_workspace_id uuid,
  form_external_id text,
  form_connection_mode text,
  form_display_name text,
  form_mapping jsonb,
  upload_file_name text,
  upload_rows jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role text;
  normalized_form_id text;
  normalized_display_name text;
  normalized_file_name text;
  normalized_mapping jsonb;
  connected_source_id uuid;
  created_upload_id uuid;
  created_upload_at timestamptz;
  upload_row_count integer;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  actor_role := public.workspace_actor_role(target_workspace_id);
  if actor_role not in ('owner', 'admin') then
    raise exception 'source_manage_forbidden'
      using errcode = '42501';
  end if;

  normalized_form_id := btrim(coalesce(form_external_id, ''));
  normalized_display_name := btrim(coalesce(form_display_name, ''));
  normalized_file_name := btrim(coalesce(upload_file_name, ''));
  normalized_mapping := coalesce(form_mapping, '{}'::jsonb);

  if normalized_form_id = ''
    or normalized_display_name = ''
    or normalized_file_name = ''
    or not (form_connection_mode = 'manual_csv')
    or not public.is_valid_google_forms_csv_mapping(normalized_mapping)
    or not public.is_valid_google_forms_csv_upload_rows(upload_rows, normalized_mapping)
  then
    raise exception 'invalid_google_forms_csv_mapping'
      using errcode = '22023';
  end if;

  select source.id
  into connected_source_id
  from public.data_sources source
  where source.workspace_id = target_workspace_id
    and source.source_type = 'forms'
    and source.config->>'externalFormId' = normalized_form_id
    and source.config->>'connectionMode' = 'manual_csv'
    and source.disconnected_at is null
  for update;

  if connected_source_id is null then
    insert into public.data_sources (
      workspace_id,
      source_type,
      display_name,
      status,
      config_version,
      config,
      connected_at,
      last_verified_at
    )
    values (
      target_workspace_id,
      'forms',
      normalized_display_name,
      'connected',
      1,
      jsonb_build_object(
        'externalFormId', normalized_form_id,
        'connectionMode', 'manual_csv',
        'mapping', normalized_mapping
      ),
      now(),
      now()
    )
    returning id into connected_source_id;
  else
    update public.data_sources
    set display_name = normalized_display_name,
        status = 'connected',
        config_version = 1,
        config = jsonb_build_object(
          'externalFormId', normalized_form_id,
          'connectionMode', 'manual_csv',
          'mapping', normalized_mapping
        ),
        last_verified_at = now()
    where id = connected_source_id;
  end if;

  upload_row_count := jsonb_array_length(upload_rows);

  insert into public.google_forms_csv_uploads (
    source_id,
    workspace_id,
    file_name,
    row_count,
    uploaded_by
  )
  values (
    connected_source_id,
    target_workspace_id,
    normalized_file_name,
    upload_row_count,
    actor_id
  )
  returning id, created_at into created_upload_id, created_upload_at;

  insert into public.google_forms_csv_rows (
    upload_id,
    source_id,
    workspace_id,
    row_number,
    response_key,
    payload
  )
  select
    created_upload_id,
    connected_source_id,
    target_workspace_id,
    (row.value->>'rowNumber')::integer,
    public.google_forms_csv_response_key(
      normalized_form_id,
      normalized_mapping,
      row.value->'payload'
    ),
    row.value->'payload'
  from jsonb_array_elements(upload_rows) as row(value)
  on conflict (source_id, response_key) do update
    set upload_id = excluded.upload_id,
        row_number = excluded.row_number,
        payload = excluded.payload;

  update public.data_sources
  set config = jsonb_build_object(
        'externalFormId', normalized_form_id,
        'connectionMode', 'manual_csv',
        'mapping', normalized_mapping,
        'latestUpload', jsonb_build_object(
          'id', created_upload_id,
          'fileName', normalized_file_name,
          'rowCount', upload_row_count,
          'uploadedAt', created_upload_at
        )
      )
  where id = connected_source_id;

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
  )
  on conflict (source_id) do update
    set status = 'queued',
        cursor = null,
        last_error = null,
        requested_at = now();

  return connected_source_id;
end;
$$;
