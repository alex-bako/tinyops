create extension if not exists supabase_vault with schema vault;

create table public.data_sources (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_type text not null,
  display_name text not null,
  status text not null default 'connected',
  config_version integer not null default 1,
  config jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  disconnected_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_sources_type_valid check (
    source_type in (
      'imap',
      'csv',
      'forms',
      'stripe',
      'mailerlite',
      'calendly',
      'teachable'
    )
  ),
  constraint data_sources_status_valid check (
    status in ('connected', 'error', 'disconnected')
  ),
  constraint data_sources_config_version_positive check (config_version > 0)
);

alter table public.data_sources enable row level security;

create trigger data_sources_set_updated_at
  before update on public.data_sources
  for each row
  execute function public.set_updated_at();

create unique index data_sources_one_active_per_workspace_type
  on public.data_sources (workspace_id, source_type)
  where disconnected_at is null;

create index data_sources_workspace_id_idx
  on public.data_sources (workspace_id)
  where disconnected_at is null;

create table public.data_source_secrets (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null references public.data_sources(id) on delete cascade,
  purpose text not null,
  vault_secret_id uuid not null,
  masked_value text not null,
  replaced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_source_secrets_purpose_valid check (
    purpose in ('imap_password')
  )
);

alter table public.data_source_secrets enable row level security;

create trigger data_source_secrets_set_updated_at
  before update on public.data_source_secrets
  for each row
  execute function public.set_updated_at();

create unique index data_source_secrets_one_active_per_purpose
  on public.data_source_secrets (source_id, purpose)
  where replaced_at is null;

create table public.data_source_sync_states (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.data_sources(id) on delete cascade,
  status text not null default 'queued',
  history_window text not null default '12mo',
  cursor jsonb,
  last_error text,
  requested_at timestamptz,
  last_started_at timestamptz,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_source_sync_states_status_valid check (
    status in ('idle', 'queued', 'running', 'error')
  ),
  constraint data_source_sync_states_history_window_valid check (
    history_window in ('30d', '90d', '12mo', 'all')
  )
);

alter table public.data_source_sync_states enable row level security;

create trigger data_source_sync_states_set_updated_at
  before update on public.data_source_sync_states
  for each row
  execute function public.set_updated_at();

create policy "Members can read data sources"
  on public.data_sources
  for select
  to authenticated
  using (
    disconnected_at is null
    and public.workspace_actor_role(workspace_id) is not null
  );

create policy "Owners and admins can create data sources"
  on public.data_sources
  for insert
  to authenticated
  with check (
    public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  );

create policy "Owners and admins can update data sources"
  on public.data_sources
  for update
  to authenticated
  using (
    public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  )
  with check (
    public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  );

create policy "Members can read data source secret metadata"
  on public.data_source_secrets
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_secrets.source_id
        and source.disconnected_at is null
        and public.workspace_actor_role(source.workspace_id) is not null
    )
  );

create policy "Members can read data source sync states"
  on public.data_source_sync_states
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_sync_states.source_id
        and source.disconnected_at is null
        and public.workspace_actor_role(source.workspace_id) is not null
    )
  );

create policy "Owners and admins can update data source sync states"
  on public.data_source_sync_states
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_sync_states.source_id
        and public.workspace_actor_role(source.workspace_id) in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_sync_states.source_id
        and public.workspace_actor_role(source.workspace_id) in ('owner', 'admin')
    )
  );

revoke all on public.data_source_secrets from anon, authenticated;
grant select (
  id,
  source_id,
  purpose,
  masked_value,
  replaced_at,
  created_at,
  updated_at
) on public.data_source_secrets to authenticated;

create or replace function public.connect_imap_data_source(
  target_workspace_id uuid,
  imap_host text,
  imap_port integer,
  imap_encryption text,
  imap_username text,
  imap_password text,
  imap_history_window text,
  imap_watched_folders text[],
  imap_skip_senders text[]
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

  normalized_host := lower(btrim(imap_host));
  normalized_username := btrim(imap_username);

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
        'username', normalized_username,
        'historyWindow', imap_history_window,
        'watchedFolders', normalized_folders,
        'skipSenders', normalized_skip_senders
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
          'username', normalized_username,
          'historyWindow', imap_history_window,
          'watchedFolders', normalized_folders,
          'skipSenders', normalized_skip_senders
        ),
        last_verified_at = now()
    where id = connected_source_id;
  end if;

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
    history_window,
    cursor,
    last_error,
    requested_at
  )
  values (
    connected_source_id,
    'queued',
    imap_history_window,
    null,
    null,
    now()
  )
  on conflict (source_id) do update
    set status = 'queued',
        history_window = excluded.history_window,
        last_error = null,
        requested_at = now();

  return connected_source_id;
end;
$$;

create or replace function public.update_imap_data_source_config(
  target_workspace_id uuid,
  target_source_id uuid,
  imap_host text,
  imap_port integer,
  imap_encryption text,
  imap_username text,
  imap_history_window text,
  imap_watched_folders text[],
  imap_skip_senders text[]
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  actor_role text;
  normalized_host text;
  normalized_username text;
  normalized_folders text[];
  normalized_skip_senders text[];
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

  normalized_host := lower(btrim(imap_host));
  normalized_username := btrim(imap_username);

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
    or imap_port < 1
    or imap_port > 65535
    or imap_encryption not in ('ssl', 'starttls', 'none')
    or imap_history_window not in ('30d', '90d', '12mo', 'all')
  then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  update public.data_sources
  set config = jsonb_build_object(
        'host', normalized_host,
        'port', imap_port,
        'encryption', imap_encryption,
        'username', normalized_username,
        'historyWindow', imap_history_window,
        'watchedFolders', normalized_folders,
        'skipSenders', normalized_skip_senders
      )
  where id = target_source_id;

  update public.data_source_sync_states
  set history_window = imap_history_window
  where source_id = target_source_id;
end;
$$;

create or replace function public.disconnect_data_source(
  target_workspace_id uuid,
  target_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select workspace_id
  into source_workspace_id
  from public.data_sources
  where id = target_source_id
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

  update public.data_sources
  set status = 'disconnected',
      disconnected_at = now()
  where id = target_source_id;
end;
$$;

create or replace function public.request_data_source_sync(
  target_workspace_id uuid,
  target_source_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select workspace_id
  into source_workspace_id
  from public.data_sources
  where id = target_source_id
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

  insert into public.data_source_sync_states (
    source_id,
    status,
    requested_at,
    last_error
  )
  values (
    target_source_id,
    'queued',
    now(),
    null
  )
  on conflict (source_id) do update
    set status = 'queued',
        requested_at = now(),
        last_error = null;
end;
$$;

grant execute on function public.connect_imap_data_source(
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text,
  text[],
  text[]
) to authenticated;
grant execute on function public.update_imap_data_source_config(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text[],
  text[]
) to authenticated;
grant execute on function public.disconnect_data_source(uuid, uuid)
  to authenticated;
grant execute on function public.request_data_source_sync(uuid, uuid)
  to authenticated;

revoke execute on function public.connect_imap_data_source(
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text,
  text[],
  text[]
) from anon, public;
revoke execute on function public.update_imap_data_source_config(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text[],
  text[]
) from anon, public;
revoke execute on function public.disconnect_data_source(uuid, uuid)
  from anon, public;
revoke execute on function public.request_data_source_sync(uuid, uuid)
  from anon, public;
