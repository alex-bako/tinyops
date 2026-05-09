create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  handle text not null unique,
  description text not null default '',
  icon_kind text not null default 'mark',
  icon_letter text,
  icon_tone text not null default 'cobalt',
  accent text not null default 'cobalt',
  plan_tier text not null default 'Team',
  plan_price text not null default '$0 / alpha',
  plan_seats integer not null default 5,
  sensitivity_mode text not null default 'strict',
  auto_send_threshold text not null default 'low-only',
  manual_review_keywords text[] not null default array['crisis', 'trauma']::text[],
  exclude_from_outbound boolean not null default true,
  archived_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspaces_handle_normalized check (
    handle = lower(btrim(handle))
    and handle ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$'
  ),
  constraint workspaces_icon_kind check (icon_kind in ('mark', 'letter')),
  constraint workspaces_icon_letter_valid check (
    icon_kind <> 'letter'
    or (icon_letter is not null and char_length(icon_letter) = 1)
  ),
  constraint workspaces_tones_valid check (
    accent in ('cobalt', 'citron', 'coral', 'mint', 'slate')
    and icon_tone in ('cobalt', 'citron', 'coral', 'mint', 'slate')
  ),
  constraint workspaces_plan_valid check (
    plan_tier in ('Solo', 'Team', 'Studio')
    and plan_seats > 0
  ),
  constraint workspaces_sensitivity_valid check (
    sensitivity_mode in ('strict', 'balanced', 'lenient')
    and auto_send_threshold in ('low-only', 'low-and-medium', 'everything')
  )
);

alter table public.workspaces enable row level security;

create trigger workspaces_set_updated_at
  before update on public.workspaces
  for each row
  execute function public.set_updated_at();

create table public.workspace_memberships (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null,
  joined_at timestamptz not null default now(),
  last_active_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_memberships_role_valid check (
    role in ('owner', 'admin', 'operator', 'reviewer', 'viewer')
  ),
  constraint workspace_memberships_one_per_user unique (workspace_id, user_id)
);

alter table public.workspace_memberships enable row level security;

create trigger workspace_memberships_set_updated_at
  before update on public.workspace_memberships
  for each row
  execute function public.set_updated_at();

create index workspace_memberships_user_id_idx
  on public.workspace_memberships (user_id);

create table public.workspace_invitations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  email text not null,
  role text not null,
  invited_by uuid not null references public.profiles(id) on delete cascade,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint workspace_invitations_email_normalized check (
    email = lower(btrim(email))
    and position('@' in email) > 1
  ),
  constraint workspace_invitations_role_valid check (
    role in ('admin', 'operator', 'reviewer', 'viewer')
  )
);

alter table public.workspace_invitations enable row level security;

create trigger workspace_invitations_set_updated_at
  before update on public.workspace_invitations
  for each row
  execute function public.set_updated_at();

create unique index workspace_invitations_one_active_per_email
  on public.workspace_invitations (workspace_id, email)
  where accepted_at is null and revoked_at is null;

create index workspace_invitations_email_idx
  on public.workspace_invitations (email)
  where accepted_at is null and revoked_at is null;

create or replace function public.workspace_actor_role(target_workspace_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select membership.role
  from public.workspace_memberships membership
  where membership.workspace_id = target_workspace_id
    and membership.user_id = (select auth.uid())
  limit 1
$$;

create or replace function public.workspace_creator_id(target_workspace_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select workspace.created_by
  from public.workspaces workspace
  where workspace.id = target_workspace_id
  limit 1
$$;

grant execute on function public.workspace_actor_role(uuid) to authenticated;
grant execute on function public.workspace_creator_id(uuid) to authenticated;
revoke execute on function public.workspace_actor_role(uuid) from anon, public;
revoke execute on function public.workspace_creator_id(uuid) from anon, public;

create policy "Members can read visible workspaces"
  on public.workspaces
  for select
  to authenticated
  using (
    archived_at is null
    and public.workspace_actor_role(id) is not null
  );

create policy "Authenticated users can create workspaces"
  on public.workspaces
  for insert
  to authenticated
  with check (created_by = (select auth.uid()));

create policy "Owners and admins can update workspaces"
  on public.workspaces
  for update
  to authenticated
  using (
    archived_at is null
    and public.workspace_actor_role(id) in ('owner', 'admin')
  )
  with check (
    public.workspace_actor_role(id) in ('owner', 'admin')
  );

create policy "Workspace co-members can read profiles"
  on public.profiles
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.workspace_memberships mine
      join public.workspace_memberships other_member
        on other_member.workspace_id = mine.workspace_id
      where mine.user_id = (select auth.uid())
        and other_member.user_id = profiles.id
    )
  );

create policy "Members can read workspace memberships"
  on public.workspace_memberships
  for select
  to authenticated
  using (
    public.workspace_actor_role(workspace_id) is not null
  );

create policy "Users can create owner membership for own new workspace"
  on public.workspace_memberships
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role = 'owner'
    and public.workspace_creator_id(workspace_id) = (select auth.uid())
  );

create policy "Owners and admins can add non-owner memberships"
  on public.workspace_memberships
  for insert
  to authenticated
  with check (
    role <> 'owner'
    and public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  );

create policy "Invitees can accept active workspace invitations"
  on public.workspace_memberships
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and role <> 'owner'
    and exists (
      select 1
      from public.workspace_invitations invitation
      where invitation.workspace_id = workspace_memberships.workspace_id
        and invitation.role = workspace_memberships.role
        and invitation.email = lower((select auth.jwt() ->> 'email'))
        and invitation.accepted_at is null
        and invitation.revoked_at is null
    )
  );

create policy "Owners and admins can update non-owner memberships"
  on public.workspace_memberships
  for update
  to authenticated
  using (
    role <> 'owner'
    and public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  )
  with check (
    role <> 'owner'
    and public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  );

create policy "Owners admins and self can remove non-owner memberships"
  on public.workspace_memberships
  for delete
  to authenticated
  using (
    role <> 'owner'
    and (
      user_id = (select auth.uid())
      or public.workspace_actor_role(workspace_id) in ('owner', 'admin')
    )
  );

create policy "Members and invitees can read workspace invitations"
  on public.workspace_invitations
  for select
  to authenticated
  using (
    public.workspace_actor_role(workspace_id) is not null
    or (
      accepted_at is null
      and revoked_at is null
      and email = lower((select auth.jwt() ->> 'email'))
    )
  );

create policy "Owners and admins can create workspace invitations"
  on public.workspace_invitations
  for insert
  to authenticated
  with check (
    public.workspace_actor_role(workspace_id) in ('owner', 'admin')
  );

create policy "Owners and admins can update workspace invitations"
  on public.workspace_invitations
  for update
  to authenticated
  using (
    public.workspace_actor_role(workspace_id) in ('owner', 'admin')
    or (
      accepted_at is null
      and revoked_at is null
      and email = lower((select auth.jwt() ->> 'email'))
    )
  )
  with check (
    public.workspace_actor_role(workspace_id) in ('owner', 'admin')
    or email = lower((select auth.jwt() ->> 'email'))
  );
