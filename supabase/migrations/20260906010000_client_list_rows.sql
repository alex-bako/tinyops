-- The clients list used the same projection as the client profile, embedding
-- every timeline event, property and attribute for every client, then capped
-- itself at 500 rows to stay affordable. The table renders eight scalar
-- columns; only the source count and the sensitivity flag need the children.
--
-- This view aggregates those two in the database so the list ships scalars.

create or replace view public.client_list_rows
with (security_invoker = true) as
select
  client.id,
  client.workspace_id,
  client.primary_email,
  client.display_name,
  client.slug,
  client.status,
  client.tags,
  client.first_seen_at,
  client.last_seen_at,
  client.last_contacted_at,
  client.do_not_contact,
  client.sensitivity_level,
  client.created_at,
  client.updated_at,
  -- Every source the client came from, whether or not it produced an event.
  (
    select count(distinct source_id)
    from (
      select source_id from public.client_identities
        where client_id = client.id and source_id is not null
      union
      select source_id from public.client_attributes
        where client_id = client.id and source_id is not null
      union
      select source_id from public.timeline_events
        where client_id = client.id and source_id is not null
    ) as client_sources
  )::int as source_count,
  -- Drives the "sensitive" flag without shipping the events themselves.
  coalesce((
    select max(event.sensitivity_level)
    from public.timeline_events event
    where event.client_id = client.id
  ), 0) as max_timeline_sensitivity
from public.clients client;

comment on view public.client_list_rows is
  'Scalar projection of clients for the list view, with source count and peak timeline sensitivity aggregated in SQL.';

grant select on public.client_list_rows to authenticated, service_role;

-- The aggregates are per-client subqueries, so the child tables need an index
-- on client_id to keep the view linear in the number of clients.
create index if not exists client_attributes_client_id_idx
  on public.client_attributes (client_id);
create index if not exists timeline_events_client_id_idx
  on public.timeline_events (client_id);
