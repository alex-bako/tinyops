create or replace function public.request_all_data_source_syncs(
  target_workspace_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  queued_count integer;
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

  insert into public.data_source_sync_states (
    source_id,
    status,
    requested_at,
    last_error
  )
  select id,
         'queued',
         now(),
         null
  from public.data_sources
  where workspace_id = target_workspace_id
    and disconnected_at is null
  on conflict (source_id) do update
    set status = 'queued',
        requested_at = excluded.requested_at,
        last_error = null;

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

grant execute on function public.request_all_data_source_syncs(uuid)
  to authenticated;
revoke execute on function public.request_all_data_source_syncs(uuid)
  from anon, public;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    return;
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'data_source_sync_states'
  ) then
    execute 'alter publication supabase_realtime add table public.data_source_sync_states';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'data_source_sync_runs'
  ) then
    execute 'alter publication supabase_realtime add table public.data_source_sync_runs';
  end if;
end;
$$;
