-- The Supabase Postgres image shipped with CLI 2.117.0 gives the `postgres`
-- role a default ACL that grants anon/authenticated full DML on every new
-- public table. 20260604000000_authenticated_table_grants.sql assumed the
-- opposite (no DML by default), so browser-facing roles silently gained
-- privileges the policies never declared. Reset to the fail-closed model:
-- nothing by default, then exactly the grants the RLS policies need.

alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated;

revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;

-- Re-apply the least-privilege grants declared across earlier migrations
-- (20260604000000 and the per-table grants after it; keep in sync).
grant select on public.profiles to authenticated;
grant select, insert, update on public.workspaces to authenticated;
grant select, insert, update on public.workspace_invitations to authenticated;
grant select, insert, update, delete on public.workspace_memberships to authenticated;
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_identities to authenticated;
grant select, insert, update, delete on public.client_attributes to authenticated;
grant select, insert, update, delete on public.raw_source_records to authenticated;
grant select, insert, update, delete on public.timeline_events to authenticated;
grant select, insert on public.client_domain_events to authenticated;
grant select, insert, update, delete on public.client_properties to authenticated;
grant select, insert, update on public.data_sources to authenticated;
grant select, update on public.data_source_sync_states to authenticated;
grant select, insert, update on public.data_source_intake_configs to authenticated;
grant select on public.data_source_sync_runs to authenticated;
grant select on public.google_forms_csv_uploads to authenticated;
grant select, insert, delete on public.client_ask_turns to authenticated;
grant select on public.client_list_rows to authenticated;

-- Column-level only: the Vault pointer stays hidden (mirrors 20260509004000).
grant select (
  id, source_id, purpose, masked_value, replaced_at, created_at, updated_at
) on public.data_source_secrets to authenticated;
