\set ON_ERROR_STOP on

reset role;

create or replace function pg_temp.assert_true(
  actual boolean,
  label text
)
returns void
language plpgsql
as $$
begin
  if not actual then
    raise exception 'Assertion failed: %', label;
  end if;
end;
$$;

-- The admin (service_role) client reads/writes these tables directly via .from().
-- Migration 20260101000000_role_privilege_defaults.sql must grant service_role
-- the DML these auth/worker paths need, or login fails with 42501.
select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.auth_invites', 'SELECT')
    and has_table_privilege('service_role', 'public.auth_invites', 'UPDATE'),
  'service_role can read and update auth_invites (invite lookup + accept)'
);

select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.profiles', 'SELECT')
    and has_table_privilege('service_role', 'public.profiles', 'INSERT')
    and has_table_privilege('service_role', 'public.profiles', 'UPDATE'),
  'service_role can upsert profiles (auth callback profile sync)'
);

select pg_temp.assert_true(
  has_table_privilege('service_role', 'public.data_sources', 'SELECT'),
  'service_role can read data_sources (sync worker)'
);

-- Core forward-looking guard: any FUTURE migration table (created as postgres)
-- must inherit service_role DML from the default-privileges foundation, so the
-- whole class of "admin client gets permission denied" bugs cannot recur.
reset role;
create table public._grant_probe (id int);

select pg_temp.assert_true(
  has_table_privilege('service_role', 'public._grant_probe', 'SELECT')
    and has_table_privilege('service_role', 'public._grant_probe', 'INSERT')
    and has_table_privilege('service_role', 'public._grant_probe', 'UPDATE')
    and has_table_privilege('service_role', 'public._grant_probe', 'DELETE'),
  'service_role auto-inherits full DML on newly created public tables'
);

drop table public._grant_probe;

-- Defense in depth: the foundation must NOT widen the browser-facing roles.
-- Their access stays governed by RLS policies and explicit per-table/column
-- grants; sensitive tables remain inaccessible to anon/authenticated by default.
select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.auth_invites', 'SELECT')
    and not has_table_privilege('authenticated', 'public.auth_invites', 'SELECT'),
  'anon/authenticated cannot read auth_invites'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.profiles', 'SELECT')
    and not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'anon/authenticated were not granted broad DML on profiles'
);

select pg_temp.assert_true(
  not has_table_privilege('anon', 'public.data_source_secrets', 'SELECT')
    and not has_table_privilege('authenticated', 'public.data_source_secrets', 'SELECT'),
  'anon/authenticated cannot read data_source_secrets'
);
