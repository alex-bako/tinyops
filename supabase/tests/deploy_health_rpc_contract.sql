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

select pg_temp.assert_true(
  to_regprocedure('public.deploy_health_check()') is not null,
  'deploy health RPC exists'
);

set role service_role;

select pg_temp.assert_true(
  public.deploy_health_check(),
  'service role can execute deploy health RPC'
);

reset role;

select pg_temp.assert_true(
  not has_function_privilege(
    'authenticated',
    'public.deploy_health_check()',
    'execute'
  ),
  'authenticated cannot execute deploy health RPC'
);

select pg_temp.assert_true(
  not has_function_privilege('anon', 'public.deploy_health_check()', 'execute'),
  'anon cannot execute deploy health RPC'
);

select pg_temp.assert_true(
  not has_function_privilege('public', 'public.deploy_health_check()', 'execute'),
  'public cannot execute deploy health RPC'
);
