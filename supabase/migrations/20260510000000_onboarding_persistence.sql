alter table public.profiles
  add column first_name text,
  add column last_name text,
  add column onboarded_at timestamptz;

alter table public.workspaces
  add column vertical text not null default 'other',
  add column default_sender_name text not null default '',
  add column initial_source_intent text not null default 'skip',
  add constraint workspaces_vertical_valid check (
    vertical in ('therapy', 'coaching', 'course', 'agency', 'other')
  ),
  add constraint workspaces_initial_source_intent_valid check (
    initial_source_intent in ('imap', 'csv', 'forms', 'skip')
  );

create or replace function public.complete_onboarding(
  actor_email text,
  profile_first_name text,
  profile_last_name text,
  profile_onboarded_at timestamptz,
  workspace_name text,
  workspace_handle text,
  workspace_icon_kind text,
  workspace_icon_letter text,
  workspace_icon_tone text,
  workspace_accent text,
  workspace_vertical text,
  workspace_default_sender_name text,
  workspace_initial_source_intent text,
  workspace_sensitivity_mode text,
  workspace_auto_send_threshold text,
  workspace_manual_review_keywords text[],
  workspace_exclude_from_outbound boolean,
  invite_emails text[],
  invite_roles text[]
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_id uuid;
  normalized_email text;
  normalized_invite_email text;
  existing_workspace_id uuid;
  created_workspace_id uuid;
  invite_index integer;
  invite_role text;
  seen_invite_emails text[] := array[]::text[];
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

  if btrim(profile_first_name) = '' then
    raise exception 'first_name_required'
      using errcode = '22023';
  end if;

  if btrim(workspace_name) = '' then
    raise exception 'workspace_name_required'
      using errcode = '22023';
  end if;

  if btrim(workspace_handle) = '' then
    raise exception 'workspace_handle_required'
      using errcode = '22023';
  end if;

  if workspace_vertical not in ('therapy', 'coaching', 'course', 'agency', 'other') then
    raise exception 'invalid_vertical'
      using errcode = '22023';
  end if;

  if workspace_initial_source_intent not in ('imap', 'csv', 'forms', 'skip') then
    raise exception 'invalid_source'
      using errcode = '22023';
  end if;

  if workspace_sensitivity_mode not in ('strict', 'balanced', 'lenient')
    or workspace_auto_send_threshold not in ('low-only', 'low-and-medium', 'everything')
  then
    raise exception 'invalid_sensitivity'
      using errcode = '22023';
  end if;

  if coalesce(array_length(invite_emails, 1), 0) <> coalesce(array_length(invite_roles, 1), 0) then
    raise exception 'invalid_invite_email'
      using errcode = '22023';
  end if;

  select workspace.id
  into existing_workspace_id
  from public.workspaces workspace
  join public.workspace_memberships membership
    on membership.workspace_id = workspace.id
  where membership.user_id = actor_id
    and workspace.archived_at is null
  order by workspace.created_at
  limit 1;

  if existing_workspace_id is not null then
    update public.profiles
    set first_name = btrim(profile_first_name),
        last_name = nullif(btrim(profile_last_name), ''),
        onboarded_at = profile_onboarded_at
    where id = actor_id;

    return existing_workspace_id;
  end if;

  insert into public.profiles (
    id,
    email,
    first_name,
    last_name,
    onboarded_at
  )
  values (
    actor_id,
    normalized_email,
    btrim(profile_first_name),
    nullif(btrim(profile_last_name), ''),
    profile_onboarded_at
  )
  on conflict (id) do update
    set email = excluded.email,
        first_name = excluded.first_name,
        last_name = excluded.last_name,
        onboarded_at = excluded.onboarded_at,
        updated_at = now();

  insert into public.workspaces (
    name,
    handle,
    description,
    icon_kind,
    icon_letter,
    icon_tone,
    accent,
    plan_tier,
    plan_price,
    plan_seats,
    sensitivity_mode,
    auto_send_threshold,
    manual_review_keywords,
    exclude_from_outbound,
    vertical,
    default_sender_name,
    initial_source_intent,
    created_by
  )
  values (
    btrim(workspace_name),
    lower(btrim(workspace_handle)),
    '',
    workspace_icon_kind,
    upper(btrim(workspace_icon_letter)),
    workspace_icon_tone,
    workspace_accent,
    'Team',
    '$0 / alpha',
    5,
    workspace_sensitivity_mode,
    workspace_auto_send_threshold,
    workspace_manual_review_keywords,
    workspace_exclude_from_outbound,
    workspace_vertical,
    btrim(workspace_default_sender_name),
    workspace_initial_source_intent,
    actor_id
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

  if coalesce(array_length(invite_emails, 1), 0) > 4 then
    raise exception 'seat_limit_reached'
      using errcode = '23514';
  end if;

  for invite_index in 1..coalesce(array_length(invite_emails, 1), 0) loop
    normalized_invite_email := lower(btrim(invite_emails[invite_index]));
    invite_role := invite_roles[invite_index];

    if normalized_invite_email is null
      or normalized_invite_email = ''
      or position('@' in normalized_invite_email) <= 1
    then
      raise exception 'invalid_invite_email'
        using errcode = '22023';
    end if;

    if invite_role not in ('admin', 'operator', 'reviewer', 'viewer') then
      raise exception 'invalid_invite_role'
        using errcode = '22023';
    end if;

    if normalized_invite_email = normalized_email
      or normalized_invite_email = any(seen_invite_emails)
    then
      raise exception 'duplicate_invite'
        using errcode = '23505';
    end if;

    seen_invite_emails := array_append(seen_invite_emails, normalized_invite_email);

    insert into public.workspace_invitations (
      workspace_id,
      email,
      role,
      invited_by
    )
    values (
      created_workspace_id,
      normalized_invite_email,
      invite_role,
      actor_id
    );

    insert into public.auth_invites (email)
    values (normalized_invite_email)
    on conflict (email) do nothing;
  end loop;

  return created_workspace_id;
end;
$$;

grant execute on function public.complete_onboarding(
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  boolean,
  text[],
  text[]
) to authenticated;
revoke execute on function public.complete_onboarding(
  text,
  text,
  text,
  timestamptz,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  text[],
  boolean,
  text[],
  text[]
) from anon, public;
