create table public.auth_invites (
  email text primary key,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint auth_invites_email_normalized check (
    email = lower(btrim(email))
    and position('@' in email) > 1
  )
);

alter table public.auth_invites enable row level security;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_email_normalized check (
    email = lower(btrim(email))
    and position('@' in email) > 1
  )
);

alter table public.profiles enable row level security;

create policy "Users can read their own profile"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

create or replace function public.enforce_invited_user(event jsonb)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  event_email text;
begin
  event_email := lower(btrim(event->'user'->>'email'));

  if event_email is null or event_email = '' then
    return jsonb_build_object(
      'error', jsonb_build_object(
        'http_code', 403,
        'message', 'Invite required.'
      )
    );
  end if;

  if exists (
    select 1
    from public.auth_invites
    where email = event_email
  ) then
    return '{}'::jsonb;
  end if;

  return jsonb_build_object(
    'error', jsonb_build_object(
      'http_code', 403,
      'message', 'Invite required.'
    )
  );
end;
$$;

grant execute on function public.enforce_invited_user(jsonb) to supabase_auth_admin;
revoke execute on function public.enforce_invited_user(jsonb) from authenticated, anon, public;
