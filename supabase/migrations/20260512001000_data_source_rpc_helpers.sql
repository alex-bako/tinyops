create or replace function public.normalize_data_source_display_name(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select btrim(coalesce(value, ''))
$$;

create or replace function public.require_data_source_slug(display_name text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  normalized_display_name text;
  normalized_slug text;
begin
  normalized_display_name := public.normalize_data_source_display_name(display_name);
  normalized_slug := public.data_source_slug_from_name(normalized_display_name);

  if normalized_display_name = ''
    or normalized_slug = ''
    or normalized_slug = 'new'
  then
    raise exception 'invalid_data_source_name'
      using errcode = '22023';
  end if;

  return normalized_slug;
end;
$$;

create or replace function public.normalized_text_array(
  input_values text[],
  fallback text[]
)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case
    when coalesce(array_length(normalized.items, 1), 0) = 0
      then coalesce(fallback, array[]::text[])
    else normalized.items
  end
  from (
    select coalesce(array_agg(item), array[]::text[]) as items
    from (
      select btrim(value) as item
      from unnest(coalesce(input_values, array[]::text[])) value
      where btrim(value) <> ''
    ) trimmed
  ) normalized
$$;

create or replace function public.mask_secret_tail(value text)
returns text
language sql
immutable
set search_path = ''
as $$
  select concat('****', right(coalesce(value, ''), 4))
$$;

create or replace function public.require_unique_data_source_name(
  target_workspace_id uuid,
  target_source_type text,
  normalized_display_name text,
  normalized_slug text,
  ignored_source_id uuid
)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.data_sources source
    where source.workspace_id = target_workspace_id
      and source.source_type = target_source_type
      and (ignored_source_id is null or source.id <> ignored_source_id)
      and source.disconnected_at is null
      and (
        lower(btrim(source.display_name)) = lower(normalized_display_name)
        or source.slug = normalized_slug
      )
  ) then
    raise exception 'duplicate_data_source_name'
      using errcode = '23505';
  end if;
end;
$$;

create or replace function public.require_unique_imap_source_config(
  target_workspace_id uuid,
  normalized_host text,
  target_port integer,
  target_encryption text,
  normalized_username text,
  ignored_source_id uuid
)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.data_sources source
    where source.workspace_id = target_workspace_id
      and source.source_type = 'imap'
      and (ignored_source_id is null or source.id <> ignored_source_id)
      and source.disconnected_at is null
      and source.config->>'host' = normalized_host
      and source.config->>'port' = target_port::text
      and source.config->>'encryption' = target_encryption
      and source.config->>'username' = normalized_username
  ) then
    raise exception 'duplicate_data_source_config'
      using errcode = '23505';
  end if;
end;
$$;

create or replace function public.require_unique_google_forms_source_config(
  target_workspace_id uuid,
  normalized_form_id text,
  target_connection_mode text,
  ignored_source_id uuid
)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.data_sources source
    where source.workspace_id = target_workspace_id
      and source.source_type = 'forms'
      and (ignored_source_id is null or source.id <> ignored_source_id)
      and source.disconnected_at is null
      and source.config->>'externalFormId' = normalized_form_id
      and source.config->>'connectionMode' = target_connection_mode
  ) then
    raise exception 'duplicate_data_source_config'
      using errcode = '23505';
  end if;
end;
$$;

revoke execute on function public.normalize_data_source_display_name(text)
  from anon, public;
revoke execute on function public.require_data_source_slug(text)
  from anon, public;
revoke execute on function public.normalized_text_array(text[], text[])
  from anon, public;
revoke execute on function public.mask_secret_tail(text)
  from anon, public;
revoke execute on function public.require_unique_data_source_name(
  uuid,
  text,
  text,
  text,
  uuid
) from anon, public;
revoke execute on function public.require_unique_imap_source_config(
  uuid,
  text,
  integer,
  text,
  text,
  uuid
) from anon, public;
revoke execute on function public.require_unique_google_forms_source_config(
  uuid,
  text,
  text,
  uuid
) from anon, public;

create or replace function public.connect_imap_data_source(
  target_workspace_id uuid,
  imap_display_name text,
  imap_host text,
  imap_port integer,
  imap_encryption text,
  imap_username text,
  imap_password text,
  imap_history_window text,
  imap_watched_folders text[],
  imap_skip_senders text[],
  imap_message_filters jsonb,
  imap_available_folders jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  normalized_display_name text;
  normalized_slug text;
  normalized_host text;
  normalized_username text;
  normalized_folders text[];
  normalized_skip_senders text[];
  normalized_message_filters jsonb;
  normalized_available_folders jsonb;
  connected_source_id uuid;
  secret_id uuid;
  secret_name text;
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

  normalized_display_name := public.normalize_data_source_display_name(
    imap_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);
  normalized_host := lower(btrim(coalesce(imap_host, '')));
  normalized_username := btrim(coalesce(imap_username, ''));
  normalized_folders := public.normalized_text_array(
    imap_watched_folders,
    array['INBOX']::text[]
  );
  normalized_skip_senders := public.normalized_text_array(
    imap_skip_senders,
    array[]::text[]
  );
  normalized_message_filters := coalesce(
    imap_message_filters,
    '{"mode":"and","rules":[]}'::jsonb
  );
  normalized_available_folders := coalesce(imap_available_folders, '[]'::jsonb);

  if normalized_host = ''
    or normalized_username = ''
    or btrim(coalesce(imap_password, '')) = ''
    or imap_port < 1
    or imap_port > 65535
    or imap_encryption not in ('ssl', 'starttls', 'none')
    or imap_history_window not in ('30d', '90d', '12mo', 'all')
    or not public.is_valid_imap_message_filters(normalized_message_filters)
    or jsonb_typeof(normalized_available_folders) <> 'array'
  then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  perform public.require_unique_data_source_name(
    target_workspace_id,
    'imap',
    normalized_display_name,
    normalized_slug,
    null
  );
  perform public.require_unique_imap_source_config(
    target_workspace_id,
    normalized_host,
    imap_port,
    imap_encryption,
    normalized_username,
    null
  );

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
    'imap',
    normalized_slug,
    normalized_display_name,
    'connected',
    1,
    jsonb_build_object(
      'host', normalized_host,
      'port', imap_port,
      'encryption', imap_encryption,
      'username', normalized_username
    ),
    now(),
    now()
  )
  returning id into connected_source_id;

  insert into public.data_source_intake_configs (
    source_id,
    history_window,
    watched_folders,
    skip_senders,
    message_filters,
    available_folders
  )
  values (
    connected_source_id,
    imap_history_window,
    normalized_folders,
    normalized_skip_senders,
    normalized_message_filters,
    normalized_available_folders
  );

  secret_name := concat(
    'tinyops:data-source:',
    connected_source_id::text,
    ':imap_password:',
    gen_random_uuid()::text
  );

  secret_id := vault.create_secret(
    imap_password,
    secret_name,
    concat('IMAP password for TinyOps data source ', connected_source_id::text)
  );

  insert into public.data_source_secrets (
    source_id,
    purpose,
    vault_secret_id,
    masked_value
  )
  values (
    connected_source_id,
    'imap_password',
    secret_id,
    public.mask_secret_tail(imap_password)
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

create or replace function public.update_imap_connection_settings(
  target_workspace_id uuid,
  target_source_id uuid,
  imap_display_name text,
  imap_host text,
  imap_port integer,
  imap_encryption text,
  imap_username text,
  imap_password text,
  imap_available_folders jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  actor_role text;
  normalized_display_name text;
  normalized_slug text;
  normalized_host text;
  normalized_username text;
  normalized_available_folders jsonb;
  secret_id uuid;
  secret_name text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select workspace_id
  into source_workspace_id
  from public.data_sources
  where id = target_source_id
    and source_type = 'imap'
    and workspace_id = target_workspace_id
    and disconnected_at is null
  for update;

  if not found then
    raise exception 'source_not_found'
      using errcode = '42501';
  end if;

  actor_role := public.workspace_actor_role(source_workspace_id);
  if actor_role not in ('owner', 'admin') then
    raise exception 'source_manage_forbidden'
      using errcode = '42501';
  end if;

  normalized_display_name := public.normalize_data_source_display_name(
    imap_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);
  normalized_host := lower(btrim(coalesce(imap_host, '')));
  normalized_username := btrim(coalesce(imap_username, ''));
  normalized_available_folders := coalesce(imap_available_folders, '[]'::jsonb);

  if normalized_host = ''
    or normalized_username = ''
    or imap_port < 1
    or imap_port > 65535
    or imap_encryption not in ('ssl', 'starttls', 'none')
    or jsonb_typeof(normalized_available_folders) <> 'array'
  then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  perform public.require_unique_data_source_name(
    target_workspace_id,
    'imap',
    normalized_display_name,
    normalized_slug,
    target_source_id
  );
  perform public.require_unique_imap_source_config(
    target_workspace_id,
    normalized_host,
    imap_port,
    imap_encryption,
    normalized_username,
    target_source_id
  );

  update public.data_sources
  set display_name = normalized_display_name,
      config = jsonb_build_object(
        'host', normalized_host,
        'port', imap_port,
        'encryption', imap_encryption,
        'username', normalized_username
      ),
      last_verified_at = now()
  where id = target_source_id;

  update public.data_source_intake_configs
  set available_folders = normalized_available_folders
  where source_id = target_source_id;

  if btrim(coalesce(imap_password, '')) <> '' then
    secret_name := concat(
      'tinyops:data-source:',
      target_source_id::text,
      ':imap_password:',
      gen_random_uuid()::text
    );

    secret_id := vault.create_secret(
      imap_password,
      secret_name,
      concat('IMAP password for TinyOps data source ', target_source_id::text)
    );

    update public.data_source_secrets
    set replaced_at = now()
    where source_id = target_source_id
      and purpose = 'imap_password'
      and replaced_at is null;

    insert into public.data_source_secrets (
      source_id,
      purpose,
      vault_secret_id,
      masked_value
    )
    values (
      target_source_id,
      'imap_password',
      secret_id,
      public.mask_secret_tail(imap_password)
    );
  end if;
end;
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
  normalized_slug text;
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
  normalized_display_name := public.normalize_data_source_display_name(
    form_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);
  normalized_file_name := btrim(coalesce(upload_file_name, ''));
  normalized_mapping := coalesce(form_mapping, '{}'::jsonb);

  if normalized_form_id = ''
    or normalized_file_name = ''
    or form_connection_mode <> 'manual_csv'
    or not public.is_valid_google_forms_csv_mapping(normalized_mapping)
    or not public.is_valid_google_forms_csv_upload_rows(upload_rows, normalized_mapping)
  then
    raise exception 'invalid_google_forms_csv_mapping'
      using errcode = '22023';
  end if;

  perform public.require_unique_data_source_name(
    target_workspace_id,
    'forms',
    normalized_display_name,
    normalized_slug,
    null
  );
  perform public.require_unique_google_forms_source_config(
    target_workspace_id,
    normalized_form_id,
    'manual_csv',
    null
  );

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
    'forms',
    normalized_slug,
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
  );

  return connected_source_id;
end;
$$;

create or replace function public.update_google_forms_manual_csv_data_source(
  target_workspace_id uuid,
  target_source_id uuid,
  form_display_name text,
  form_mapping jsonb,
  upload_file_name text,
  upload_rows jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role text;
  source_workspace_id uuid;
  normalized_form_id text;
  normalized_display_name text;
  normalized_slug text;
  normalized_file_name text;
  normalized_mapping jsonb;
  created_upload_id uuid;
  created_upload_at timestamptz;
  upload_row_count integer;
begin
  actor_id := auth.uid();
  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select source.workspace_id, source.config->>'externalFormId'
  into source_workspace_id, normalized_form_id
  from public.data_sources source
  where source.id = target_source_id
    and source.workspace_id = target_workspace_id
    and source.source_type = 'forms'
    and source.config->>'connectionMode' = 'manual_csv'
    and source.disconnected_at is null
  for update;

  if not found then
    raise exception 'source_not_found'
      using errcode = '42501';
  end if;

  actor_role := public.workspace_actor_role(source_workspace_id);
  if actor_role not in ('owner', 'admin') then
    raise exception 'source_manage_forbidden'
      using errcode = '42501';
  end if;

  normalized_display_name := public.normalize_data_source_display_name(
    form_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);
  normalized_file_name := btrim(coalesce(upload_file_name, ''));
  normalized_mapping := coalesce(form_mapping, '{}'::jsonb);

  if normalized_file_name = ''
    or normalized_form_id = ''
    or not public.is_valid_google_forms_csv_mapping(normalized_mapping)
    or not public.is_valid_google_forms_csv_upload_rows(upload_rows, normalized_mapping)
  then
    raise exception 'invalid_google_forms_csv_mapping'
      using errcode = '22023';
  end if;

  perform public.require_unique_data_source_name(
    source_workspace_id,
    'forms',
    normalized_display_name,
    normalized_slug,
    target_source_id
  );

  upload_row_count := jsonb_array_length(upload_rows);

  insert into public.google_forms_csv_uploads (
    source_id,
    workspace_id,
    file_name,
    row_count,
    uploaded_by
  )
  values (
    target_source_id,
    source_workspace_id,
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
    target_source_id,
    source_workspace_id,
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
  set display_name = normalized_display_name,
      status = 'connected',
      config_version = 1,
      config = jsonb_build_object(
        'externalFormId', normalized_form_id,
        'connectionMode', 'manual_csv',
        'mapping', normalized_mapping,
        'latestUpload', jsonb_build_object(
          'id', created_upload_id,
          'fileName', normalized_file_name,
          'rowCount', upload_row_count,
          'uploadedAt', created_upload_at
        )
      ),
      last_verified_at = now()
  where id = target_source_id;

  insert into public.data_source_sync_states (
    source_id,
    status,
    cursor,
    last_error,
    requested_at
  )
  values (
    target_source_id,
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
end;
$$;
