-- User-defined, typed key/value properties shown on the client detail page.
--
-- Notion-style records: each row is a named property of one of four types
-- (text, tags, date, status) with a type-shaped jsonb value, an icon, and a
-- float position that gives a stable, reorderable display order. Properties are
-- workspace-scoped client metadata; members read, owners/admins manage —
-- mirroring the timeline_events policies. created_by records the author and
-- defaults to the acting user so writers never pass it.

create table public.client_properties (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  icon text not null,
  type text not null,
  value jsonb not null default '{}'::jsonb,
  position double precision not null default 0,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint client_properties_type_valid check (
    type in ('text', 'tags', 'date', 'status')
  ),
  constraint client_properties_name_not_blank check (length(btrim(name)) > 0)
);

-- "properties for client X, in display order" — the only access path.
create index client_properties_client_position_idx
  on public.client_properties (client_id, position);

alter table public.client_properties enable row level security;

create policy "Members can read client properties"
  on public.client_properties
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Owners and admins can manage client properties"
  on public.client_properties
  for all
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'))
  with check (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));
