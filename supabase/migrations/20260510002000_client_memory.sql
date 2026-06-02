create extension if not exists pg_trgm;

-- Transliterating slugifier. Folds accented Latin letters to their ASCII base
-- before collapsing the rest to dashes, so "István Kóródi" -> "istvan-korodi"
-- instead of "istv-n-k-r-di". Uses only pg_catalog builtins so it is safe to
-- call from functions running with `search_path = ''`.
create or replace function public.slugify_client_name(value text)
returns text
language sql
immutable
as $$
  select trim(both '-' from regexp_replace(
    translate(
      -- multi-character expansions first (translate can only map 1:1)
      replace(replace(replace(replace(
        lower(coalesce(value, '')),
        'ß', 'ss'), 'æ', 'ae'), 'œ', 'oe'), 'ø', 'o'),
      -- 1:1 accented -> ascii; from/to are aligned and equal length (59 chars)
      'àáâãäåāăąçćčďđèéêëēėęěìíîïįīıłńñňòóôõöōőŕřśšťțùúûüūůűųýÿžźż',
      'aaaaaaaaacccddeeeeeeeeiiiiiiilnnnooooooorrssttuuuuuuuuyyzzz'),
    '[^a-z0-9]+', '-', 'g'));
$$;

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  primary_email text not null,
  display_name text not null default '',
  slug text not null,
  status text not null default 'active',
  tags text[] not null default array[]::text[],
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  last_contacted_at timestamptz,
  do_not_contact boolean not null default false,
  unsubscribe_status text not null default 'subscribed',
  consent_status text not null default 'unknown',
  sensitivity_level integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint clients_primary_email_normalized check (
    primary_email = lower(btrim(primary_email))
    and position('@' in primary_email) > 1
  ),
  constraint clients_slug_normalized check (
    slug = lower(btrim(slug))
    and slug ~ '^[a-z0-9][a-z0-9-]{0,78}[a-z0-9]$'
  ),
  constraint clients_status_valid check (
    status in ('active', 'inactive', 'sensitive', 'dnc')
  ),
  constraint clients_unsubscribe_status_valid check (
    unsubscribe_status in ('subscribed', 'unsubscribed', 'unknown')
  ),
  constraint clients_consent_status_valid check (
    consent_status in ('unknown', 'granted', 'revoked')
  ),
  constraint clients_sensitivity_level_valid check (
    sensitivity_level between 0 and 4
  )
);

alter table public.clients enable row level security;

create trigger clients_set_updated_at
  before update on public.clients
  for each row
  execute function public.set_updated_at();

create unique index clients_one_primary_email_per_workspace
  on public.clients (workspace_id, primary_email);

create unique index clients_one_slug_per_workspace
  on public.clients (workspace_id, slug);

create index clients_workspace_last_seen_idx
  on public.clients (workspace_id, last_seen_at desc nulls last);

create index clients_email_trgm_idx
  on public.clients using gin (primary_email gin_trgm_ops);

create index clients_display_name_trgm_idx
  on public.clients using gin (display_name gin_trgm_ops);

create table public.client_identities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  identity_type text not null,
  identity_value text not null,
  normalized_value text not null,
  verified boolean not null default true,
  source_id uuid references public.data_sources(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint client_identities_type_valid check (
    identity_type in ('email', 'phone', 'external_id')
  ),
  constraint client_identities_value_present check (
    btrim(identity_value) <> ''
    and btrim(normalized_value) <> ''
  ),
  constraint client_identities_email_normalized check (
    identity_type <> 'email'
    or (
      normalized_value = lower(btrim(normalized_value))
      and position('@' in normalized_value) > 1
    )
  )
);

alter table public.client_identities enable row level security;

create unique index client_identities_one_value_per_workspace_type
  on public.client_identities (workspace_id, identity_type, normalized_value);

create index client_identities_client_id_idx
  on public.client_identities (client_id);

create table public.raw_source_records (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  source_id uuid not null references public.data_sources(id) on delete cascade,
  external_id text not null,
  record_type text not null,
  raw_payload jsonb not null default '{}'::jsonb,
  body_text text not null default '',
  content_hash text not null,
  ingested_at timestamptz not null default now(),
  processed_at timestamptz,
  processing_status text not null default 'processed',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint raw_source_records_external_id_present check (
    btrim(external_id) <> ''
  ),
  constraint raw_source_records_content_hash_present check (
    btrim(content_hash) <> ''
  ),
  constraint raw_source_records_processing_status_valid check (
    processing_status in ('pending', 'processed', 'error')
  )
);

alter table public.raw_source_records enable row level security;

create trigger raw_source_records_set_updated_at
  before update on public.raw_source_records
  for each row
  execute function public.set_updated_at();

create unique index raw_source_records_unique_external_id
  on public.raw_source_records (
    workspace_id,
    source_id,
    record_type,
    external_id
  );

create index raw_source_records_source_idx
  on public.raw_source_records (source_id, ingested_at desc);

create table public.client_attributes (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_id uuid references public.data_sources(id) on delete set null,
  raw_record_id uuid references public.raw_source_records(id) on delete set null,
  attribute_key text not null,
  attribute_value jsonb not null,
  confidence numeric(5, 4) not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_attributes_key_present check (
    btrim(attribute_key) <> ''
  ),
  constraint client_attributes_confidence_valid check (
    confidence >= 0
    and confidence <= 1
  )
);

alter table public.client_attributes enable row level security;

create trigger client_attributes_set_updated_at
  before update on public.client_attributes
  for each row
  execute function public.set_updated_at();

create index client_attributes_client_key_idx
  on public.client_attributes (client_id, attribute_key);

create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  source_id uuid references public.data_sources(id) on delete set null,
  raw_record_id uuid references public.raw_source_records(id) on delete set null,
  event_type text not null,
  event_date timestamptz not null,
  title text not null,
  summary text not null default '',
  body_text text not null default '',
  participants jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  sensitivity_level integer not null default 0,
  ai_extracted_fields jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint timeline_events_event_type_valid check (
    event_type in (
      'email_received',
      'email_sent',
      'form_submission',
      'csv_import_row',
      'manual_note',
      'tinyops_email',
      'system_event'
    )
  ),
  constraint timeline_events_title_present check (btrim(title) <> ''),
  constraint timeline_events_participants_array check (
    jsonb_typeof(participants) = 'array'
  ),
  constraint timeline_events_sensitivity_level_valid check (
    sensitivity_level between 0 and 4
  )
);

alter table public.timeline_events enable row level security;

create trigger timeline_events_set_updated_at
  before update on public.timeline_events
  for each row
  execute function public.set_updated_at();

create unique index timeline_events_unique_source_event
  on public.timeline_events (client_id, raw_record_id, event_type)
  where raw_record_id is not null;

create index timeline_events_client_date_idx
  on public.timeline_events (client_id, event_date desc);

create index timeline_events_workspace_date_idx
  on public.timeline_events (workspace_id, event_date desc);

create table public.client_domain_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  source_id uuid references public.data_sources(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint client_domain_events_event_type_present check (
    btrim(event_type) <> ''
  )
);

alter table public.client_domain_events enable row level security;

create index client_domain_events_workspace_idx
  on public.client_domain_events (workspace_id, occurred_at desc);

create or replace function public.client_domain_events_append_only()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'client_domain_events_append_only'
    using errcode = '42501';
end;
$$;

create trigger client_domain_events_append_only
  before update or delete on public.client_domain_events
  for each row
  execute function public.client_domain_events_append_only();

alter table public.data_source_sync_states
  add column if not exists lease_owner text,
  add column if not exists lease_token text,
  add column if not exists lease_expires_at timestamptz,
  add column if not exists sync_error_count integer not null default 0;

create index data_source_sync_states_claimable_idx
  on public.data_source_sync_states (
    status,
    lease_expires_at,
    requested_at
  )
  where status in ('queued', 'error');

create policy "Members can read clients"
  on public.clients
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can manage clients"
  on public.clients
  for all
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));

create policy "Members can read client identities"
  on public.client_identities
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can manage client identities"
  on public.client_identities
  for all
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));

create policy "Members can read client attributes"
  on public.client_attributes
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can manage client attributes"
  on public.client_attributes
  for all
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));

create policy "Members can read raw source records"
  on public.raw_source_records
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can manage raw source records"
  on public.raw_source_records
  for all
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));

create policy "Members can read timeline events"
  on public.timeline_events
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can manage timeline events"
  on public.timeline_events
  for all
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));

create policy "Members can read client domain events"
  on public.client_domain_events
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can append client domain events"
  on public.client_domain_events
  for insert
  to authenticated
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));
