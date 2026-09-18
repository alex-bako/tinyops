-- Tells a signed-in person whether one workspace handle is still free, so onboarding and
-- the create-workspace form can say so before the unique index does (OBI-5, OBI-6).
--
-- It answers with a boolean and nothing else: no name, no id, no count, no timestamp. An
-- authenticated user learning that a handle exists is the accepted tradeoff for live
-- feedback (OBI-7, D3); anything more would be a workspace directory.

create or replace function public.workspace_handle_available(
  target_handle text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  -- Deliberately unfiltered: the question being answered is whether
  -- `workspaces.handle`, which is `unique` across every row, would accept this value.
  -- An archived workspace still holds its handle, so it still makes it unavailable.
  return not exists (
    select 1
    from public.workspaces
    where handle = target_handle
  );
end;
$$;

grant execute on function public.workspace_handle_available(text)
  to authenticated;

revoke execute on function public.workspace_handle_available(text)
  from anon, public;
