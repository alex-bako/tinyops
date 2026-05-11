alter table public.data_source_sync_states
  drop constraint if exists data_source_sync_states_history_window_valid;

alter table public.data_source_sync_states
  drop column if exists history_window;

create or replace function public.connect_imap_data_source(
  target_workspace_id uuid,
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
  normalized_host text;
  normalized_username text;
  normalized_folders text[];
  normalized_skip_senders text[];
  normalized_message_filters jsonb;
  normalized_available_folders jsonb;
  connected_source_id uuid;
  secret_id uuid;
  secret_name text;
  masked_password text;
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

  normalized_host := lower(btrim(coalesce(imap_host, '')));
  normalized_username := btrim(coalesce(imap_username, ''));
  normalized_message_filters := coalesce(
    imap_message_filters,
    '{"mode":"and","rules":[]}'::jsonb
  );
  normalized_available_folders := coalesce(imap_available_folders, '[]'::jsonb);

  select coalesce(array_agg(folder), array[]::text[])
  into normalized_folders
  from (
    select btrim(value) as folder
    from unnest(coalesce(imap_watched_folders, array[]::text[])) value
    where btrim(value) <> ''
  ) folders;

  if coalesce(array_length(normalized_folders, 1), 0) = 0 then
    normalized_folders := array['INBOX']::text[];
  end if;

  select coalesce(array_agg(sender), array[]::text[])
  into normalized_skip_senders
  from (
    select btrim(value) as sender
    from unnest(coalesce(imap_skip_senders, array[]::text[])) value
    where btrim(value) <> ''
  ) senders;

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

  select source.id
  into connected_source_id
  from public.data_sources source
  where source.workspace_id = target_workspace_id
    and source.source_type = 'imap'
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
      'imap',
      'IMAP mailbox',
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
  else
    update public.data_sources
    set display_name = 'IMAP mailbox',
        status = 'connected',
        config_version = 1,
        config = jsonb_build_object(
          'host', normalized_host,
          'port', imap_port,
          'encryption', imap_encryption,
          'username', normalized_username
        ),
        last_verified_at = now()
    where id = connected_source_id;
  end if;

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
  )
  on conflict (source_id) do update
    set history_window = excluded.history_window,
        watched_folders = excluded.watched_folders,
        skip_senders = excluded.skip_senders,
        message_filters = excluded.message_filters,
        available_folders = excluded.available_folders;

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

  masked_password := concat('****', right(imap_password, 4));

  update public.data_source_secrets
  set replaced_at = now()
  where source_id = connected_source_id
    and purpose = 'imap_password'
    and replaced_at is null;

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
    masked_password
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
  )
  on conflict (source_id) do update
    set status = 'queued',
        last_error = null,
        requested_at = now();

  return connected_source_id;
end;
$$;

create or replace function public.update_imap_intake_config(
  target_workspace_id uuid,
  target_source_id uuid,
  imap_history_window text,
  imap_watched_folders text[],
  imap_skip_senders text[],
  imap_message_filters jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  actor_role text;
  normalized_folders text[];
  normalized_skip_senders text[];
  normalized_message_filters jsonb;
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

  normalized_message_filters := coalesce(
    imap_message_filters,
    '{"mode":"and","rules":[]}'::jsonb
  );

  select coalesce(array_agg(folder), array[]::text[])
  into normalized_folders
  from (
    select btrim(value) as folder
    from unnest(coalesce(imap_watched_folders, array[]::text[])) value
    where btrim(value) <> ''
  ) folders;

  if coalesce(array_length(normalized_folders, 1), 0) = 0 then
    normalized_folders := array['INBOX']::text[];
  end if;

  select coalesce(array_agg(sender), array[]::text[])
  into normalized_skip_senders
  from (
    select btrim(value) as sender
    from unnest(coalesce(imap_skip_senders, array[]::text[])) value
    where btrim(value) <> ''
  ) senders;

  if imap_history_window not in ('30d', '90d', '12mo', 'all')
    or not public.is_valid_imap_message_filters(normalized_message_filters)
  then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  update public.data_source_intake_configs
  set history_window = imap_history_window,
      watched_folders = normalized_folders,
      skip_senders = normalized_skip_senders,
      message_filters = normalized_message_filters
  where source_id = target_source_id;
end;
$$;
