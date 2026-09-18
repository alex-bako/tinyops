-- Accepting a workspace invitation also onboards the invitee (INV-4, INV-11):
-- optional name capture and profiles.onboarded_at are set in the same transaction
-- as the membership, so an invitee never has to create a workspace of their own.

drop function if exists public.accept_workspace_invitation(uuid);

create or replace function public.accept_workspace_invitation(
  target_invitation_id uuid,
  target_first_name text default null,
  target_last_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_email text;
  invitation public.workspace_invitations%rowtype;
begin
  actor_id := auth.uid();
  actor_email := lower(coalesce(auth.jwt() ->> 'email', ''));

  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select *
  into invitation
  from public.workspace_invitations
  where id = target_invitation_id
    and email = actor_email
    and accepted_at is null
    and revoked_at is null
  for update;

  if not found then
    raise exception 'Workspace invitation not found'
      using errcode = '42501';
  end if;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role
  )
  values (
    invitation.workspace_id,
    actor_id,
    invitation.role
  );

  update public.workspace_invitations
  set accepted_at = now()
  where id = target_invitation_id;

  update public.profiles
  set first_name = coalesce(nullif(btrim(target_first_name), ''), first_name),
      last_name = coalesce(nullif(btrim(target_last_name), ''), last_name),
      onboarded_at = coalesce(onboarded_at, now()),
      updated_at = now()
  where id = actor_id;

  return invitation.workspace_id;
end;
$$;

grant execute on function public.accept_workspace_invitation(uuid, text, text)
  to authenticated;
revoke execute on function public.accept_workspace_invitation(uuid, text, text)
  from anon, public;
