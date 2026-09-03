-- MailerLite data source: API key in Vault, subscribers as identities,
-- e-commerce orders as payment events, campaign opens/clicks as
-- email_engagement events.

alter table public.data_source_secrets
  drop constraint if exists data_source_secrets_purpose_valid;

alter table public.data_source_secrets
  add constraint data_source_secrets_purpose_valid check (
    purpose in ('imap_password', 'stripe_api_key', 'mailerlite_api_key')
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
      'payment',
      'email_engagement'
    )
  );

create unique index if not exists data_sources_one_active_mailerlite_account
  on public.data_sources (workspace_id, (config->>'accountId'))
  where source_type = 'mailerlite'
    and disconnected_at is null;

-- `mailerlite_account_id` is the connected shop ids (comma separated) when
-- the account has e-commerce shops; otherwise the key hash stands in so the
-- same key cannot be connected twice.
create or replace function public.connect_mailerlite_data_source(
  target_workspace_id uuid,
  mailerlite_display_name text,
  mailerlite_account_id text,
  mailerlite_api_key text,
  mailerlite_sync_from timestamptz,
  mailerlite_shops jsonb default '[]'::jsonb
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

  if btrim(coalesce(mailerlite_api_key, '')) = '' then
    raise exception 'invalid_mailerlite_config'
      using errcode = '22023';
  end if;

  normalized_account_id := coalesce(
    nullif(btrim(coalesce(mailerlite_account_id, '')), ''),
    concat('key:', md5(btrim(mailerlite_api_key)))
  );
  normalized_display_name := public.normalize_data_source_display_name(
    mailerlite_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);

  perform public.require_unique_data_source_name(
    target_workspace_id,
    'mailerlite',
    normalized_display_name,
    normalized_slug,
    null
  );

  if exists (
    select 1
    from public.data_sources source
    where source.workspace_id = target_workspace_id
      and source.source_type = 'mailerlite'
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
    'mailerlite',
    normalized_slug,
    normalized_display_name,
    'connected',
    1,
    jsonb_build_object(
      'accountId', normalized_account_id,
      'syncFrom', mailerlite_sync_from,
      'shops', case
        when jsonb_typeof(mailerlite_shops) = 'array' then mailerlite_shops
        else '[]'::jsonb
      end
    ),
    now(),
    now()
  )
  returning id into connected_source_id;

  secret_name := concat(
    'tinyops:data-source:',
    connected_source_id::text,
    ':mailerlite_api_key:',
    gen_random_uuid()::text
  );

  secret_id := vault.create_secret(
    mailerlite_api_key,
    secret_name,
    concat('MailerLite API key for TinyOps data source ', connected_source_id::text)
  );

  insert into public.data_source_secrets (
    source_id,
    purpose,
    vault_secret_id,
    masked_value
  )
  values (
    connected_source_id,
    'mailerlite_api_key',
    secret_id,
    public.mask_secret_tail(mailerlite_api_key)
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

grant execute on function public.connect_mailerlite_data_source(
  uuid,
  text,
  text,
  text,
  timestamptz,
  jsonb
) to authenticated;

revoke execute on function public.connect_mailerlite_data_source(
  uuid,
  text,
  text,
  text,
  timestamptz,
  jsonb
) from anon, public;

create or replace function public.read_mailerlite_data_source_api_key(
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
      and source.source_type = 'mailerlite'
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
    and secret.purpose = 'mailerlite_api_key'
    and secret.replaced_at is null
  order by secret.created_at desc
  limit 1;

  if active_secret_id is null then
    raise exception 'invalid_mailerlite_config'
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

grant execute on function public.read_mailerlite_data_source_api_key(uuid, uuid)
  to service_role;
revoke execute on function public.read_mailerlite_data_source_api_key(uuid, uuid)
  from anon, authenticated, public;
