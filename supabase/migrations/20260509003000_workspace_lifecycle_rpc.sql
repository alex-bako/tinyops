create or replace function public.create_personal_workspace(
  workspace_name text,
  workspace_handle text,
  actor_email text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  normalized_email text;
  created_workspace_id uuid;
begin
  actor_id := auth.uid();
  normalized_email := lower(btrim(actor_email));

  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if normalized_email is null
    or normalized_email = ''
    or normalized_email <> lower(coalesce(auth.jwt() ->> 'email', ''))
  then
    raise exception 'Workspace actor email mismatch'
      using errcode = '42501';
  end if;

  insert into public.workspaces (
    name,
    handle,
    created_by,
    description,
    icon_kind,
    icon_tone,
    accent,
    plan_tier,
    plan_price,
    plan_seats,
    sensitivity_mode,
    auto_send_threshold,
    manual_review_keywords,
    exclude_from_outbound
  )
  values (
    btrim(workspace_name),
    lower(btrim(workspace_handle)),
    actor_id,
    '',
    'mark',
    'cobalt',
    'cobalt',
    'Team',
    '$0 / alpha',
    5,
    'strict',
    'low-only',
    array['crisis', 'trauma']::text[],
    true
  )
  returning id into created_workspace_id;

  insert into public.workspace_memberships (
    workspace_id,
    user_id,
    role
  )
  values (
    created_workspace_id,
    actor_id,
    'owner'
  );

  return created_workspace_id;
end;
$$;

create or replace function public.create_workspace_invitation(
  target_workspace_id uuid,
  target_email text,
  target_role text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  actor_role text;
  normalized_email text;
  member_count integer;
  pending_invite_count integer;
  seat_limit integer;
  inserted_invitation public.workspace_invitations%rowtype;
begin
  actor_id := auth.uid();
  actor_role := public.workspace_actor_role(target_workspace_id);
  normalized_email := lower(btrim(target_email));

  if actor_id is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if actor_role not in ('owner', 'admin') then
    raise exception 'Workspace invite forbidden'
      using errcode = '42501';
  end if;

  if normalized_email is null
    or normalized_email = ''
    or position('@' in normalized_email) <= 1
  then
    raise exception 'invalid_email'
      using errcode = '22023';
  end if;

  if target_role not in ('admin', 'operator', 'reviewer', 'viewer') then
    raise exception 'owner_invite_forbidden'
      using errcode = '22023';
  end if;

  select workspace.plan_seats
  into seat_limit
  from public.workspaces workspace
  where workspace.id = target_workspace_id
    and workspace.archived_at is null
  for update;

  if not found then
    raise exception 'workspace_not_found'
      using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.workspace_memberships membership
    join public.profiles profile
      on profile.id = membership.user_id
    where membership.workspace_id = target_workspace_id
      and lower(profile.email) = normalized_email
  ) then
    raise exception 'duplicate_invite'
      using errcode = '23505';
  end if;

  if exists (
    select 1
    from public.workspace_invitations invitation
    where invitation.workspace_id = target_workspace_id
      and invitation.email = normalized_email
      and invitation.accepted_at is null
      and invitation.revoked_at is null
  ) then
    raise exception 'duplicate_invite'
      using errcode = '23505';
  end if;

  select count(*)
  into member_count
  from public.workspace_memberships membership
  where membership.workspace_id = target_workspace_id;

  select count(*)
  into pending_invite_count
  from public.workspace_invitations invitation
  where invitation.workspace_id = target_workspace_id
    and invitation.accepted_at is null
    and invitation.revoked_at is null;

  if member_count + pending_invite_count >= seat_limit then
    raise exception 'seat_limit_reached'
      using errcode = '23514';
  end if;

  insert into public.workspace_invitations (
    workspace_id,
    email,
    role,
    invited_by
  )
  values (
    target_workspace_id,
    normalized_email,
    target_role,
    actor_id
  )
  returning * into inserted_invitation;

  insert into public.auth_invites (email)
  values (normalized_email)
  on conflict (email) do nothing;

  return jsonb_build_object(
    'id', inserted_invitation.id,
    'workspace_id', inserted_invitation.workspace_id,
    'email', inserted_invitation.email,
    'role', inserted_invitation.role
  );
end;
$$;

create or replace function public.accept_workspace_invitation(
  target_invitation_id uuid
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

  return invitation.workspace_id;
end;
$$;

create or replace function public.archive_workspace(
  target_workspace_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  if public.workspace_actor_role(target_workspace_id) <> 'owner' then
    raise exception 'Workspace archive forbidden'
      using errcode = '42501';
  end if;

  update public.workspaces
  set archived_at = now()
  where id = target_workspace_id
    and archived_at is null;
end;
$$;

create or replace function public.revoke_workspace_invitation(
  target_invitation_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  invitation_workspace_id uuid;
  actor_role text;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  select workspace_id
  into invitation_workspace_id
  from public.workspace_invitations
  where id = target_invitation_id;

  if not found then
    raise exception 'Workspace invitation not found'
      using errcode = '42501';
  end if;

  actor_role := public.workspace_actor_role(invitation_workspace_id);

  if actor_role not in ('owner', 'admin') then
    raise exception 'Workspace invite revoke forbidden'
      using errcode = '42501';
  end if;

  update public.workspace_invitations
  set revoked_at = now()
  where id = target_invitation_id
    and accepted_at is null
    and revoked_at is null;
end;
$$;

grant execute on function public.create_personal_workspace(text, text, text)
  to authenticated;
grant execute on function public.create_workspace_invitation(uuid, text, text)
  to authenticated;
grant execute on function public.accept_workspace_invitation(uuid)
  to authenticated;
grant execute on function public.archive_workspace(uuid)
  to authenticated;
grant execute on function public.revoke_workspace_invitation(uuid)
  to authenticated;

revoke execute on function public.create_personal_workspace(text, text, text)
  from anon, public;
revoke execute on function public.create_workspace_invitation(uuid, text, text)
  from anon, public;
revoke execute on function public.accept_workspace_invitation(uuid)
  from anon, public;
revoke execute on function public.archive_workspace(uuid)
  from anon, public;
revoke execute on function public.revoke_workspace_invitation(uuid)
  from anon, public;
