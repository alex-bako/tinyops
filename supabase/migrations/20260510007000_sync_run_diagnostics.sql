alter table public.data_source_sync_runs
  add column if not exists diagnostics jsonb;
