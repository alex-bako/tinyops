-- Backing grants for the `authenticated` role's RLS policies.
--
-- Migrations run as the `postgres` role, whose default ACL grants the API roles
-- no DML (only TRUNCATE/REFERENCES/TRIGGER/MAINTAIN). The table migrations define
-- RLS policies `to authenticated` but never added the matching table grants, so
-- those policies were dead: a policy without a grant grants nothing, and direct
-- `.from(table)` reads as the signed-in user failed with 42501 (e.g. the /home
-- page reading public.profiles).
--
-- `authenticated` is an untrusted, browser-facing role, so we grant it the
-- LEAST privilege its policies actually declare (fail-closed) rather than a
-- blanket default-privilege grant. Row access stays gated by the RLS policies;
-- this only opens the privilege class the policies already assume. The privilege
-- set per table mirrors that table's authenticated policy commands (an `ALL`
-- policy => select, insert, update, delete).
--
-- Single source of truth: keeping every `authenticated` grant here gives one
-- audit surface for the untrusted role. The invariant in
-- supabase/tests/rls_grant_invariants_contract.sql asserts every RLS policy has
-- a backing grant, so a future table that adds policies but forgets the grant
-- fails CI.
--
-- EXCLUDED on purpose: public.data_source_secrets. It keeps its column-level
-- SELECT grant (masked metadata only) so the `vault_secret_id` Vault pointer
-- stays hidden from authenticated. Do not add a table-level grant here.

-- Auth / app profile
grant select on public.profiles to authenticated;

-- Workspaces
grant select, insert, update on public.workspaces to authenticated;
grant select, insert, update on public.workspace_invitations to authenticated;
grant select, insert, update, delete on public.workspace_memberships to authenticated;

-- Client memory
grant select, insert, update, delete on public.clients to authenticated;
grant select, insert, update, delete on public.client_identities to authenticated;
grant select, insert, update, delete on public.client_attributes to authenticated;
grant select, insert, update, delete on public.raw_source_records to authenticated;
grant select, insert, update, delete on public.timeline_events to authenticated;
grant select, insert on public.client_domain_events to authenticated;
grant select, insert, update, delete on public.client_properties to authenticated;

-- Data sources (data_source_secrets intentionally omitted; see header)
grant select, insert, update on public.data_sources to authenticated;
grant select, update on public.data_source_sync_states to authenticated;
grant insert, update on public.data_source_intake_configs to authenticated;
