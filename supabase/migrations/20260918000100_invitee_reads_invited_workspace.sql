-- M1.T1: a pending invitee must be able to read the workspace they were invited
-- to (name/icon on the Join page) before they are a member.
create policy "Invitees can read invited workspaces"
  on public.workspaces
  for select
  to authenticated
  using (
    archived_at is null
    and exists (
      select 1
      from public.workspace_invitations invitation
      where invitation.workspace_id = workspaces.id
        and invitation.accepted_at is null
        and invitation.revoked_at is null
        and invitation.email = lower((select auth.jwt() ->> 'email'))
    )
  );
