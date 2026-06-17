-- Gmail data-source connector.
--
-- Mirrors the IMAP connector at the database layer: extend the source-type and
-- secret-purpose constraints, add a per-account uniqueness index, and provide
-- connect / token-read / token-rotate / intake-update RPCs. Reuses the shared
-- helpers from 20260512001000_data_source_rpc_helpers.sql and the generic
-- intake-config table + message-filter validator.

-- 1. Allow the gmail source type and the gmail refresh-token secret purpose.
alter table public.data_sources
  drop constraint if exists data_sources_type_valid;
alter table public.data_sources
  add constraint data_sources_type_valid check (
    source_type in (
      'imap',
      'gmail',
      'csv',
      'forms',
      'stripe',
      'mailerlite',
      'calendly',
      'teachable'
    )
  );

alter table public.data_source_secrets
  drop constraint if exists data_source_secrets_purpose_valid;
alter table public.data_source_secrets
  add constraint data_source_secrets_purpose_valid check (
    purpose in ('imap_password', 'gmail_oauth_refresh_token')
  );

-- 2. At most one active Gmail mailbox per email address per workspace.
create unique index if not exists data_sources_one_active_gmail_account
  on public.data_sources (workspace_id, (config ->> 'emailAddress'))
  where disconnected_at is null and source_type = 'gmail';

-- 3. Per-account uniqueness helper (parity with require_unique_imap_source_config).
create or replace function public.require_unique_gmail_source_config(
  target_workspace_id uuid,
  normalized_email text,
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
      and source.source_type = 'gmail'
      and (ignored_source_id is null or source.id <> ignored_source_id)
      and source.disconnected_at is null
      and source.config ->> 'emailAddress' = normalized_email
  ) then
    raise exception 'duplicate_data_source_config'
      using errcode = '23505';
  end if;
end;
$$;

revoke execute on function public.require_unique_gmail_source_config(uuid, text, uuid)
  from anon, public;

-- 4. Connect (or reconnect). Upserts by email address so that re-running the
--    OAuth grant after a revocation rotates the refresh token in place rather
--    than colliding with the one-active-account index.
create or replace function public.connect_gmail_data_source(
  target_workspace_id uuid,
  gmail_display_name text,
  gmail_email text,
  gmail_refresh_token text,
  gmail_history_window text,
  gmail_watched_labels text[],
  gmail_skip_senders text[],
  gmail_message_filters jsonb,
  gmail_available_labels jsonb
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
  normalized_email text;
  normalized_labels text[];
  normalized_skip_senders text[];
  normalized_message_filters jsonb;
  normalized_available_labels jsonb;
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
    gmail_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);
  normalized_email := lower(btrim(coalesce(gmail_email, '')));
  normalized_labels := public.normalized_text_array(
    gmail_watched_labels,
    array['INBOX', 'SENT']::text[]
  );
  normalized_skip_senders := public.normalized_text_array(
    gmail_skip_senders,
    array[]::text[]
  );
  normalized_message_filters := coalesce(
    gmail_message_filters,
    '{"mode":"and","rules":[]}'::jsonb
  );
  normalized_available_labels := coalesce(gmail_available_labels, '[]'::jsonb);

  if normalized_email = ''
    or position('@' in normalized_email) = 0
    or btrim(coalesce(gmail_refresh_token, '')) = ''
    or gmail_history_window not in ('30d', '90d', '12mo', 'all')
    or not public.is_valid_imap_message_filters(normalized_message_filters)
    or jsonb_typeof(normalized_available_labels) <> 'array'
  then
    raise exception 'invalid_gmail_config'
      using errcode = '22023';
  end if;

  -- Reconnect path: an active Gmail source for this address already exists.
  select id
  into connected_source_id
  from public.data_sources
  where workspace_id = target_workspace_id
    and source_type = 'gmail'
    and disconnected_at is null
    and config ->> 'emailAddress' = normalized_email
  for update;

  if connected_source_id is null then
    perform public.require_unique_data_source_name(
      target_workspace_id,
      'gmail',
      normalized_display_name,
      normalized_slug,
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
      'gmail',
      normalized_slug,
      normalized_display_name,
      'connected',
      1,
      jsonb_build_object('emailAddress', normalized_email),
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
      gmail_history_window,
      normalized_labels,
      normalized_skip_senders,
      normalized_message_filters,
      normalized_available_labels
    );
  else
    update public.data_sources
    set status = 'connected',
        last_verified_at = now()
    where id = connected_source_id;

    update public.data_source_intake_configs
    set available_folders = normalized_available_labels
    where source_id = connected_source_id;
  end if;

  -- Rotate the stored refresh token (replaces any prior active secret).
  secret_name := concat(
    'tinyops:data-source:',
    connected_source_id::text,
    ':gmail_oauth_refresh_token:',
    gen_random_uuid()::text
  );

  secret_id := vault.create_secret(
    gmail_refresh_token,
    secret_name,
    concat(
      'Gmail OAuth refresh token for TinyOps data source ',
      connected_source_id::text
    )
  );

  update public.data_source_secrets
  set replaced_at = now()
  where source_id = connected_source_id
    and purpose = 'gmail_oauth_refresh_token'
    and replaced_at is null;

  insert into public.data_source_secrets (
    source_id,
    purpose,
    vault_secret_id,
    masked_value
  )
  values (
    connected_source_id,
    'gmail_oauth_refresh_token',
    secret_id,
    public.mask_secret_tail(gmail_refresh_token)
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

-- 5. Service-role token reader (used by the sync worker to mint access tokens).
create or replace function public.read_gmail_data_source_refresh_token(
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
  decrypted_token text;
begin
  if not exists (
    select 1
    from public.data_sources source
    where source.id = target_source_id
      and source.workspace_id = target_workspace_id
      and source.source_type = 'gmail'
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
    and secret.purpose = 'gmail_oauth_refresh_token'
    and secret.replaced_at is null
  order by secret.created_at desc
  limit 1;

  if active_secret_id is null then
    raise exception 'invalid_gmail_config'
      using errcode = '22023';
  end if;

  begin
    select decrypted.decrypted_secret
    into decrypted_token
    from vault.decrypted_secrets decrypted
    where decrypted.id = active_secret_id;
  exception
    when others then
      raise exception 'secret_read_failed'
        using errcode = 'XX000';
  end;

  if decrypted_token is null then
    raise exception 'secret_read_failed'
      using errcode = 'XX000';
  end if;

  if btrim(decrypted_token) = '' then
    raise exception 'invalid_gmail_config'
      using errcode = '22023';
  end if;

  return decrypted_token;
end;
$$;

grant execute on function public.read_gmail_data_source_refresh_token(uuid, uuid)
  to service_role;
revoke execute on function public.read_gmail_data_source_refresh_token(uuid, uuid)
  from anon, authenticated, public;

-- 6. Service-role token rotation (when Google returns a replacement refresh token).
create or replace function public.rotate_gmail_data_source_refresh_token(
  target_workspace_id uuid,
  target_source_id uuid,
  new_refresh_token text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  secret_id uuid;
  secret_name text;
begin
  if btrim(coalesce(new_refresh_token, '')) = '' then
    return;
  end if;

  if not exists (
    select 1
    from public.data_sources source
    where source.id = target_source_id
      and source.workspace_id = target_workspace_id
      and source.source_type = 'gmail'
      and source.disconnected_at is null
  ) then
    raise exception 'source_not_found'
      using errcode = '42501';
  end if;

  secret_name := concat(
    'tinyops:data-source:',
    target_source_id::text,
    ':gmail_oauth_refresh_token:',
    gen_random_uuid()::text
  );

  secret_id := vault.create_secret(
    new_refresh_token,
    secret_name,
    concat(
      'Gmail OAuth refresh token for TinyOps data source ',
      target_source_id::text
    )
  );

  update public.data_source_secrets
  set replaced_at = now()
  where source_id = target_source_id
    and purpose = 'gmail_oauth_refresh_token'
    and replaced_at is null;

  insert into public.data_source_secrets (
    source_id,
    purpose,
    vault_secret_id,
    masked_value
  )
  values (
    target_source_id,
    'gmail_oauth_refresh_token',
    secret_id,
    public.mask_secret_tail(new_refresh_token)
  );
end;
$$;

grant execute on function public.rotate_gmail_data_source_refresh_token(uuid, uuid, text)
  to service_role;
revoke execute on function public.rotate_gmail_data_source_refresh_token(uuid, uuid, text)
  from anon, authenticated, public;

-- 7. Intake settings update (watched labels / filters / skip senders / window).
create or replace function public.update_gmail_intake_config(
  target_workspace_id uuid,
  target_source_id uuid,
  gmail_history_window text,
  gmail_watched_labels text[],
  gmail_skip_senders text[],
  gmail_message_filters jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_workspace_id uuid;
  actor_role text;
  normalized_labels text[];
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
    and source_type = 'gmail'
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
    gmail_message_filters,
    '{"mode":"and","rules":[]}'::jsonb
  );
  normalized_labels := public.normalized_text_array(
    gmail_watched_labels,
    array['INBOX', 'SENT']::text[]
  );
  normalized_skip_senders := public.normalized_text_array(
    gmail_skip_senders,
    array[]::text[]
  );

  if gmail_history_window not in ('30d', '90d', '12mo', 'all')
    or not public.is_valid_imap_message_filters(normalized_message_filters)
  then
    raise exception 'invalid_gmail_config'
      using errcode = '22023';
  end if;

  update public.data_source_intake_configs
  set history_window = gmail_history_window,
      watched_folders = normalized_labels,
      skip_senders = normalized_skip_senders,
      message_filters = normalized_message_filters
  where source_id = target_source_id;
end;
$$;

grant execute on function public.connect_gmail_data_source(
  uuid, text, text, text, text, text[], text[], jsonb, jsonb
) to authenticated;
revoke execute on function public.connect_gmail_data_source(
  uuid, text, text, text, text, text[], text[], jsonb, jsonb
) from anon, public;

grant execute on function public.update_gmail_intake_config(
  uuid, uuid, text, text[], text[], jsonb
) to authenticated;
revoke execute on function public.update_gmail_intake_config(
  uuid, uuid, text, text[], text[], jsonb
) from anon, public;
