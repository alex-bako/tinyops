create or replace function public.is_valid_imap_message_filters(filters jsonb)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when filters is null then false
    when jsonb_typeof(filters) is distinct from 'object' then false
    when filters->>'mode' is distinct from 'and' then false
    when jsonb_typeof(filters->'rules') is distinct from 'array' then false
    else not exists (
      select 1
      from jsonb_array_elements(filters->'rules') as rule(value)
      where jsonb_typeof(rule.value) is distinct from 'object'
        or jsonb_typeof(rule.value->'id') is distinct from 'string'
        or btrim(rule.value->>'id') = ''
        or jsonb_typeof(rule.value->'field') is distinct from 'string'
        or rule.value->>'field' not in ('from', 'to', 'subject', 'body')
        or jsonb_typeof(rule.value->'operator') is distinct from 'string'
        or rule.value->>'operator' not in (
          'is',
          'is_not',
          'contains',
          'does_not_contain'
        )
        or jsonb_typeof(rule.value->'value') is distinct from 'string'
        or btrim(rule.value->>'value') = ''
    )
  end
$$;

create table public.data_source_intake_configs (
  id uuid primary key default gen_random_uuid(),
  source_id uuid not null unique references public.data_sources(id) on delete cascade,
  history_window text not null default '12mo',
  watched_folders text[] not null default array['INBOX']::text[],
  skip_senders text[] not null default array[]::text[],
  message_filters jsonb not null default '{"mode":"and","rules":[]}'::jsonb,
  available_folders jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint data_source_intake_configs_history_window_valid check (
    history_window in ('30d', '90d', '12mo', 'all')
  ),
  constraint data_source_intake_configs_message_filters_valid check (
    public.is_valid_imap_message_filters(message_filters)
  ),
  constraint data_source_intake_configs_available_folders_array check (
    jsonb_typeof(available_folders) = 'array'
  )
);

alter table public.data_source_intake_configs enable row level security;

create trigger data_source_intake_configs_set_updated_at
  before update on public.data_source_intake_configs
  for each row
  execute function public.set_updated_at();

create policy "Members can read data source intake configs"
  on public.data_source_intake_configs
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_intake_configs.source_id
        and source.disconnected_at is null
        and public.workspace_actor_role(source.workspace_id) is not null
    )
  );

create policy "Owners and admins can create data source intake configs"
  on public.data_source_intake_configs
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_intake_configs.source_id
        and public.workspace_actor_role(source.workspace_id) in ('owner', 'admin')
    )
  );

create policy "Owners and admins can update data source intake configs"
  on public.data_source_intake_configs
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_intake_configs.source_id
        and public.workspace_actor_role(source.workspace_id) in ('owner', 'admin')
    )
  )
  with check (
    exists (
      select 1
      from public.data_sources source
      where source.id = data_source_intake_configs.source_id
        and public.workspace_actor_role(source.workspace_id) in ('owner', 'admin')
    )
  );

revoke all on public.data_source_intake_configs from anon;
grant select on public.data_source_intake_configs to authenticated;

insert into public.data_source_intake_configs (
  source_id,
  history_window,
  watched_folders,
  skip_senders,
  message_filters,
  available_folders
)
select
  source.id,
  case
    when source.config->>'historyWindow' in ('30d', '90d', '12mo', 'all')
      then source.config->>'historyWindow'
    else '12mo'
  end,
  coalesce(
    (
      select array_agg(folder)
      from (
        select btrim(value) as folder
        from jsonb_array_elements_text(coalesce(source.config->'watchedFolders', '[]'::jsonb)) value
        where btrim(value) <> ''
      ) folders
    ),
    array['INBOX']::text[]
  ),
  coalesce(
    (
      select array_agg(sender)
      from (
        select btrim(value) as sender
        from jsonb_array_elements_text(coalesce(source.config->'skipSenders', '[]'::jsonb)) value
        where btrim(value) <> ''
      ) senders
    ),
    array[]::text[]
  ),
  case
    when public.is_valid_imap_message_filters(source.config->'messageFilters')
      then source.config->'messageFilters'
    else '{"mode":"and","rules":[]}'::jsonb
  end,
  case
    when jsonb_typeof(source.config->'availableFolders') = 'array'
      then source.config->'availableFolders'
    else '[]'::jsonb
  end
from public.data_sources source
where source.source_type = 'imap'
on conflict (source_id) do update
  set history_window = excluded.history_window,
      watched_folders = excluded.watched_folders,
      skip_senders = excluded.skip_senders,
      message_filters = excluded.message_filters,
      available_folders = excluded.available_folders;

update public.data_sources
set config = jsonb_build_object(
      'host', lower(btrim(coalesce(config->>'host', ''))),
      'port', coalesce((config->>'port')::integer, 993),
      'encryption', coalesce(config->>'encryption', 'ssl'),
      'username', btrim(coalesce(config->>'username', ''))
    )
where source_type = 'imap';

drop function if exists public.connect_imap_data_source(
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text,
  text[],
  text[]
);

drop function if exists public.update_imap_data_source_config(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text[],
  text[]
);

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

create or replace function public.update_imap_connection_settings(
  target_workspace_id uuid,
  target_source_id uuid,
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
  normalized_host text;
  normalized_username text;
  normalized_available_folders jsonb;
  secret_id uuid;
  secret_name text;
  masked_password text;
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

  update public.data_sources
  set config = jsonb_build_object(
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

    masked_password := concat('****', right(imap_password, 4));

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
      masked_password
    );
  end if;
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

  update public.data_source_sync_states
  set history_window = imap_history_window
  where source_id = target_source_id;
end;
$$;

create or replace function public.update_imap_folder_snapshot(
  target_workspace_id uuid,
  target_source_id uuid,
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
  normalized_available_folders jsonb;
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

  normalized_available_folders := coalesce(imap_available_folders, '[]'::jsonb);

  if jsonb_typeof(normalized_available_folders) <> 'array' then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  update public.data_source_intake_configs
  set available_folders = normalized_available_folders
  where source_id = target_source_id;
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
  text[],
  jsonb,
  jsonb
) to authenticated;
grant execute on function public.update_imap_connection_settings(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) to authenticated;
grant execute on function public.update_imap_intake_config(
  uuid,
  uuid,
  text,
  text[],
  text[],
  jsonb
) to authenticated;
grant execute on function public.update_imap_folder_snapshot(
  uuid,
  uuid,
  jsonb
) to authenticated;

revoke execute on function public.connect_imap_data_source(
  uuid,
  text,
  integer,
  text,
  text,
  text,
  text,
  text[],
  text[],
  jsonb,
  jsonb
) from anon, public;
revoke execute on function public.update_imap_connection_settings(
  uuid,
  uuid,
  text,
  integer,
  text,
  text,
  text,
  jsonb
) from anon, public;
revoke execute on function public.update_imap_intake_config(
  uuid,
  uuid,
  text,
  text[],
  text[],
  jsonb
) from anon, public;
revoke execute on function public.update_imap_folder_snapshot(
  uuid,
  uuid,
  jsonb
) from anon, public;
