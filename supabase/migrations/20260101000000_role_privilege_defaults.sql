-- Foundation: default privileges for the trusted server-only role.
--
-- Supabase auto-grants DML to anon/authenticated/service_role only for objects
-- created by the `supabase_admin` role. Our migrations run as `postgres`, whose
-- default ACL grants the API roles only TRUNCATE/REFERENCES/TRIGGER/MAINTAIN --
-- no SELECT/INSERT/UPDATE/DELETE. As a result every migration-created table gave
-- the admin (service_role) client no access, and the auth flow's direct .from()
-- reads/writes (auth_invites, profiles, data_sources) failed with 42501
-- "permission denied for table ...".
--
-- service_role is the trusted, server-only role (rolbypassrls = true) and is
-- never exposed to the browser, so granting it full DML is safe, bypasses RLS,
-- and mirrors Supabase's intended posture (the supabase_admin default ACL).
--
-- This migration is timestamped to run before any `create table`, so every table
-- and sequence created by later migrations inherits these grants automatically --
-- no per-table grants required, ever.
--
-- authenticated/anon are deliberately NOT widened here: their access stays
-- governed by RLS policies and explicit per-table/column grants (e.g. the
-- column-level grant on data_source_secrets).

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to service_role;

alter default privileges for role postgres in schema public
  grant execute on functions to service_role;
