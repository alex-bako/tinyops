-- Sync queue fairness: a permanently failing source used to starve the whole
-- queue. `fail_data_source_sync` left `requested_at` untouched, and the claim
-- accepts status 'error' ordered by `requested_at`, so the oldest broken source
-- won every claim, burned the entire cron batch, and every connector behind it
-- was never reached.
--
-- A failed source now has `requested_at` pushed into the future by an
-- exponential backoff, which both moves it to the back of the existing ordering
-- and keeps it unclaimable until it is due. `requested_at` is used rather than
-- `updated_at` because a BEFORE UPDATE trigger rewrites `updated_at` on every
-- write, so a cursor update would otherwise reset the backoff.

create or replace function public.claim_next_data_source_sync(
  worker_id text,
  lease_seconds integer default 300
)
returns table (
  source_id uuid,
  workspace_id uuid,
  source_type text,
  lease_token text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  claimed_source_id uuid;
  claimed_workspace_id uuid;
  claimed_source_type text;
  claimed_lease_token text;
begin
  if btrim(coalesce(worker_id, '')) = '' then
    raise exception 'invalid_worker_id'
      using errcode = '22023';
  end if;

  select sync_state.source_id,
         source.workspace_id,
         source.source_type
  into claimed_source_id,
       claimed_workspace_id,
       claimed_source_type
  from public.data_source_sync_states sync_state
  join public.data_sources source
    on source.id = sync_state.source_id
  where source.disconnected_at is null
    and source.status <> 'disconnected'
    -- 'running' is reachable only through the lease check below, which reclaims
    -- a job abandoned by a crashed worker instead of leaving it stuck forever.
    and sync_state.status in ('queued', 'error', 'running')
    and (
      sync_state.lease_expires_at is null
      or sync_state.lease_expires_at < now()
    )
    -- A failed source waits out the backoff `fail_data_source_sync` wrote into
    -- `requested_at`, so it cannot monopolise the queue.
    and (
      sync_state.status <> 'error'
      or sync_state.requested_at is null
      or sync_state.requested_at <= now()
    )
  order by sync_state.requested_at asc nulls first,
           sync_state.updated_at asc
  for update skip locked
  limit 1;

  if claimed_source_id is null then
    return;
  end if;

  claimed_lease_token := gen_random_uuid()::text;

  update public.data_source_sync_states sync_state
  set status = 'running',
      lease_owner = worker_id,
      lease_token = claimed_lease_token,
      lease_expires_at = now() + make_interval(secs => greatest(lease_seconds, 1)),
      last_started_at = now(),
      last_error = null
  where sync_state.source_id = claimed_source_id;

  source_id := claimed_source_id;
  workspace_id := claimed_workspace_id;
  source_type := claimed_source_type;
  lease_token := claimed_lease_token;
  return next;
end;
$$;

-- Failing defers the next attempt by 2^n minutes, capped at 30.
create or replace function public.fail_data_source_sync(
  target_source_id uuid,
  lease_token text,
  sync_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.data_source_sync_states
  set status = 'error',
      last_error = left(coalesce(sync_error, 'sync_failed'), 2000),
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      sync_error_count = sync_error_count + 1,
      requested_at = now() + make_interval(
        secs => least(60 * power(2, least(sync_error_count, 5)), 1800)
      )
  where source_id = target_source_id
    and status = 'running'
    and data_source_sync_states.lease_token = fail_data_source_sync.lease_token;

  if not found then
    raise exception 'sync_lease_not_owned'
      using errcode = '42501';
  end if;
end;
$$;

-- A successful run clears the backoff, otherwise the delay would keep growing
-- across the whole lifetime of a source.
create or replace function public.complete_data_source_sync(
  target_source_id uuid,
  lease_token text,
  next_cursor jsonb,
  has_more boolean default false
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.data_source_sync_states
  set status = case when has_more then 'queued' else 'idle' end,
      cursor = coalesce(next_cursor, cursor),
      requested_at = case when has_more then now() else requested_at end,
      last_error = null,
      lease_owner = null,
      lease_token = null,
      lease_expires_at = null,
      sync_error_count = 0,
      last_synced_at = now()
  where source_id = target_source_id
    and status = 'running'
    and data_source_sync_states.lease_token = complete_data_source_sync.lease_token;

  if not found then
    raise exception 'sync_lease_not_owned'
      using errcode = '42501';
  end if;
end;
$$;
