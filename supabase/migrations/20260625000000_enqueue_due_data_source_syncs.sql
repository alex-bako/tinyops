-- Periodic incremental sync: a system (cron) entry point that re-queues every
-- connected connector that is currently idle. In-flight states (queued, running,
-- error) are deliberately skipped so the tick never clobbers active work, which
-- makes it safe to call unconditionally on every cron cadence.
create or replace function public.enqueue_due_data_source_syncs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  queued_count integer;
begin
  update public.data_source_sync_states sync_state
  set status = 'queued',
      requested_at = now(),
      last_error = null
  from public.data_sources source
  where source.id = sync_state.source_id
    and source.disconnected_at is null
    and source.status <> 'disconnected'
    and sync_state.status = 'idle';

  get diagnostics queued_count = row_count;
  return queued_count;
end;
$$;

revoke execute on function public.enqueue_due_data_source_syncs()
  from public, anon, authenticated;
grant execute on function public.enqueue_due_data_source_syncs()
  to service_role;
