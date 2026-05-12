create or replace function public.deploy_health_check()
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  perform 1 from public.workspaces limit 1;
  return true;
end;
$$;

grant execute on function public.deploy_health_check()
  to service_role;
revoke execute on function public.deploy_health_check()
  from anon, authenticated, public;
