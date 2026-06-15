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

-- Invariant: every RLS policy on a browser-facing role (anon/authenticated) must
-- have a backing table or column grant for the privilege it governs. A policy
-- without a grant is dead -- it grants nothing and the matching .from() call
-- fails with 42501. This guard makes that whole class impossible to reintroduce:
-- add a table + policy in a future migration and forget the grant, and CI fails.
--
-- Privilege mapping: a policy with cmd = ALL requires select/insert/update/delete.
-- SELECT/INSERT/UPDATE are satisfied by a table grant OR a column grant (column
-- grants are how data_source_secrets exposes masked metadata). DELETE is
-- table-level only.
do $$
declare
  missing text;
begin
  with policy_reqs as (
    select p.tablename, r.role, c.priv
    from pg_policies p
    cross join lateral unnest(p.roles) as r(role)
    cross join lateral (
      select unnest(
        case when p.cmd = 'ALL'
             then array['SELECT', 'INSERT', 'UPDATE', 'DELETE']
             else array[p.cmd] end
      ) as priv
    ) c
    where p.schemaname = 'public'
      and r.role in ('anon', 'authenticated')
  )
  select string_agg(
           format('%s lacks %s on public.%I', role, priv, tablename),
           E'\n' order by tablename, role, priv
         )
    into missing
  from (select distinct tablename, role, priv from policy_reqs) pr
  where not (
    case pr.priv
      when 'DELETE' then
        has_table_privilege(pr.role, format('public.%I', pr.tablename), 'DELETE')
      else
        has_table_privilege(pr.role, format('public.%I', pr.tablename), pr.priv)
        or has_any_column_privilege(pr.role, format('public.%I', pr.tablename), pr.priv)
    end
  );

  if missing is not null then
    raise exception E'Dead RLS policies (policy without backing grant):\n%', missing;
  end if;
end;
$$;

-- Defense in depth: the secret Vault pointer must never be readable by the
-- browser-facing role, even though masked metadata columns are.
select pg_temp.assert_true(
  not has_column_privilege(
    'authenticated', 'public.data_source_secrets', 'vault_secret_id', 'SELECT'
  ),
  'authenticated cannot read data_source_secrets.vault_secret_id'
);

select pg_temp.assert_true(
  has_any_column_privilege(
    'authenticated', 'public.data_source_secrets', 'SELECT'
  ),
  'authenticated can read non-secret data_source_secrets columns (masked metadata)'
);

-- auth_invites has RLS enabled and no policy for the browser-facing roles, so it
-- must stay fully closed to them (the admin/service_role client reads it instead).
select pg_temp.assert_true(
  not has_table_privilege('authenticated', 'public.auth_invites', 'SELECT')
    and not has_table_privilege('anon', 'public.auth_invites', 'SELECT'),
  'anon/authenticated have no access to auth_invites'
);
