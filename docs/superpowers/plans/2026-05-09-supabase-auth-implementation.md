# Supabase Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Install and wire Supabase Auth for TinyOps with invite-only magic-link sign-in, local development docs, protected app routes, and automated tests.

**Architecture:** Supabase owns authentication and database access. Next.js 16 uses a root `apps/web/proxy.ts` to refresh sessions and protect `/home`; route handlers and server actions use focused helpers under `apps/web/lib/supabase` and `apps/web/lib/auth`. The database has `public.auth_invites`, `public.profiles`, RLS, and a `before_user_created` auth hook to reject uninvited signup attempts.

**Tech Stack:** Next.js 16 App Router, React 19 server actions, Supabase CLI/Auth/Postgres, `@supabase/ssr`, `@supabase/supabase-js`, Vitest, pnpm/Turborepo.

---

## File Structure

- Modify `apps/web/package.json`: add Supabase dependencies.
- Modify `pnpm-lock.yaml`: update dependency lockfile.
- Create `supabase/migrations/20260509000000_auth_invites_profiles.sql`: tables, RLS, trigger, auth hook function.
- Modify `supabase/config.toml`: enable `auth.hook.before_user_created`.
- Modify `supabase/seed.sql`: seed a local invited email.
- Create `apps/web/lib/database.types.ts`: typed public schema surface until `pnpm supabase:types` regenerates it.
- Create `apps/web/lib/supabase/env.ts`: required environment variable helpers.
- Create `apps/web/lib/supabase/browser.ts`: browser Supabase client factory.
- Create `apps/web/lib/supabase/server.ts`: cookie-aware server Supabase client factory.
- Create `apps/web/lib/supabase/admin.ts`: server-only service-role client factory.
- Create `apps/web/lib/supabase/proxy.ts`: token refresh and route-protection helper.
- Create `apps/web/proxy.ts`: Next.js 16 root proxy entrypoint.
- Create `apps/web/lib/auth/email.ts`: email normalization.
- Create `apps/web/lib/auth/invites.ts`: invite lookup helper.
- Create `apps/web/lib/auth/profile.ts`: profile upsert and invite acceptance helper.
- Create `apps/web/lib/auth/redirect.ts`: callback URL helper.
- Create `apps/web/app/login/_state.ts`: login state types and messages.
- Create `apps/web/app/login/_request-magic-link.ts`: injectable login action implementation.
- Create `apps/web/app/login/actions.ts`: server action entrypoint.
- Modify `apps/web/app/login/page.tsx`: wire magic-link action and hide inactive auth controls.
- Create `apps/web/app/auth/callback/_callback.ts`: injectable callback behavior.
- Create `apps/web/app/auth/callback/route.ts`: magic-link callback route.
- Create `apps/web/app/auth/sign-out/route.ts`: sign-out route.
- Modify `apps/web/app/(app)/layout.tsx`: load signed-in email for the app shell.
- Modify `apps/web/components/app-shell.tsx`: accept current user email.
- Modify `apps/web/components/app-sidebar.tsx`: pass current user email to the sidebar user block.
- Modify `apps/web/components/sidebar-user.tsx`: show signed-in email and add a sign-out POST form.
- Modify `apps/web/.env.example`: document Supabase URL, publishable key, and service-role key.
- Modify `README.md`: document the local Supabase/auth development loop.
- Add tests next to the helpers they exercise.

---

### Task 1: Install Supabase Packages

**Files:**
- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`

- [ ] **Step 1: Add packages**

Run:

```bash
pnpm add -F web @supabase/supabase-js @supabase/ssr
```

Expected: `apps/web/package.json` includes both packages and `pnpm-lock.yaml` changes.

- [ ] **Step 2: Inspect installed versions**

Run:

```bash
pnpm list -F web @supabase/supabase-js @supabase/ssr
```

Expected: both packages are listed under `web`.

---

### Task 2: Add Database Schema And Auth Hook

**Files:**
- Create: `supabase/migrations/20260509000000_auth_invites_profiles.sql`
- Modify: `supabase/config.toml`
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Add migration**

Create a migration with:

```sql
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
```

- [ ] **Step 2: Enable hook in config**

Uncomment and set:

```toml
[auth.hook.before_user_created]
enabled = true
uri = "pg-functions://postgres/public/enforce_invited_user"
```

- [ ] **Step 3: Seed local invite**

Add to `supabase/seed.sql`:

```sql
insert into public.auth_invites (email)
values ('anna@example.co')
on conflict (email) do nothing;
```

---

### Task 3: Add Typed Supabase Helpers

**Files:**
- Create: `apps/web/lib/database.types.ts`
- Create: `apps/web/lib/supabase/env.ts`
- Create: `apps/web/lib/supabase/browser.ts`
- Create: `apps/web/lib/supabase/server.ts`
- Create: `apps/web/lib/supabase/admin.ts`

- [ ] **Step 1: Create database types**

Add a minimal generated-style `Database` type for `auth_invites` and `profiles`.

- [ ] **Step 2: Create env helper**

Implement:

```ts
export function getSupabaseUrl(): string
export function getSupabasePublishableKey(): string
export function getSupabaseServiceRoleKey(): string
```

Each helper reads the matching environment variable, trims it, and throws a clear error when missing.

- [ ] **Step 3: Create client factories**

Create:

```ts
createBrowserClient<Database>(url, publishableKey)
createServerClient<Database>(url, publishableKey, { cookies })
createClient<Database>(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})
```

Expected: browser/server code cannot import the service-role key unless it imports `admin.ts`.

---

### Task 4: Add Auth Domain Helpers And Tests

**Files:**
- Create: `apps/web/lib/auth/email.ts`
- Create: `apps/web/lib/auth/email.test.ts`
- Create: `apps/web/lib/auth/invites.ts`
- Create: `apps/web/lib/auth/invites.test.ts`
- Create: `apps/web/lib/auth/profile.ts`
- Create: `apps/web/lib/auth/redirect.ts`

- [ ] **Step 1: Write email tests**

Tests:

```ts
expect(normalizeEmail(" Anna@Example.CO ")).toBe("anna@example.co")
expect(normalizeEmail("not-email")).toBeNull()
expect(normalizeEmail(null)).toBeNull()
```

- [ ] **Step 2: Implement email normalization**

Use a simple non-whitespace email pattern and lowercase trimmed values.

- [ ] **Step 3: Write invite tests**

Tests verify:

```ts
await expect(isInvitedEmail("anna@example.co", invitedClient)).resolves.toBe(true)
await expect(isInvitedEmail("nope@example.co", emptyClient)).resolves.toBe(false)
await expect(isInvitedEmail("anna@example.co", failingClient)).rejects.toThrow("Could not check invite")
```

- [ ] **Step 4: Implement invite/profile helpers**

`isInvitedEmail` uses `.from("auth_invites").select("email").eq("email", email).maybeSingle()`.

`acceptInviteAndUpsertProfile` normalizes the user email, upserts `profiles`, and sets `accepted_at` on the invite row.

---

### Task 5: Add Login Server Action And Tests

**Files:**
- Create: `apps/web/app/login/_state.ts`
- Create: `apps/web/app/login/_request-magic-link.ts`
- Create: `apps/web/app/login/_request-magic-link.test.ts`
- Create: `apps/web/app/login/actions.ts`
- Modify: `apps/web/app/login/page.tsx`

- [ ] **Step 1: Write action tests**

Tests cover:

```ts
uninvited email -> status "uninvited", sendMagicLink not called
invalid email -> status "invalid", sendMagicLink not called
invited email -> status "sent", sendMagicLink called with /auth/callback URL
Supabase send failure -> status "error"
```

- [ ] **Step 2: Implement injectable action helper**

`requestMagicLinkWithDependencies(previousState, formData, deps)` returns typed login state and calls dependencies in order.

- [ ] **Step 3: Implement server action**

`requestMagicLink` wires the helper to `isInvitedEmail`, `createServerSupabaseClient`, and `signInWithOtp({ email, options: { emailRedirectTo, shouldCreateUser: true } })`.

- [ ] **Step 4: Wire login UI**

Use React `useActionState(requestMagicLink, initialLoginState)`. Keep the existing Google/password JSX in the file, but hide it from the rendered active flow.

---

### Task 6: Add Callback And Sign-Out Routes

**Files:**
- Create: `apps/web/app/auth/callback/_callback.ts`
- Create: `apps/web/app/auth/callback/_callback.test.ts`
- Create: `apps/web/app/auth/callback/route.ts`
- Create: `apps/web/app/auth/sign-out/route.ts`

- [ ] **Step 1: Write callback tests**

Tests cover:

```ts
missing code -> /login?auth=expired
exchange error -> /login?auth=expired
successful exchange -> sync profile and redirect /home
successful exchange with next=/home/clients -> redirect /home/clients
unsafe next=https://example.com -> redirect /home
```

- [ ] **Step 2: Implement callback helper**

Parse `code` and safe same-origin relative `next` values. Exchange code, read user, sync profile, and return a redirect path.

- [ ] **Step 3: Implement route handlers**

`GET /auth/callback` uses the helper and redirects. `POST /auth/sign-out` signs out and redirects to `/login`.

---

### Task 7: Add Route Protection Proxy And Tests

**Files:**
- Create: `apps/web/lib/supabase/proxy.ts`
- Create: `apps/web/lib/supabase/proxy.test.ts`
- Create: `apps/web/proxy.ts`

- [ ] **Step 1: Write proxy tests**

Tests cover:

```ts
isProtectedPath("/home") === true
isProtectedPath("/home/clients") === true
isProtectedPath("/login") === false
resolveAuthRedirect({ pathname: "/home", hasUser: false }) === "/login"
resolveAuthRedirect({ pathname: "/login", hasUser: true }) === "/home"
resolveAuthRedirect({ pathname: "/home", hasUser: true }) === null
```

- [ ] **Step 2: Implement pure route helpers**

Export `isProtectedPath`, `isPublicAuthPath`, and `resolveAuthRedirect`.

- [ ] **Step 3: Implement Supabase session refresh**

Use `createServerClient` with request/response cookie `getAll` and `setAll`, call `auth.getUser()`, then apply `resolveAuthRedirect`.

- [ ] **Step 4: Add root proxy**

`apps/web/proxy.ts` exports:

```ts
export async function proxy(request: NextRequest) {
  return updateSession(request)
}
```

and a matcher excluding Next internals and static assets.

---

### Task 8: Wire App Shell User And Sign-Out UI

**Files:**
- Modify: `apps/web/app/(app)/layout.tsx`
- Modify: `apps/web/components/app-shell.tsx`
- Modify: `apps/web/components/app-sidebar.tsx`
- Modify: `apps/web/components/sidebar-user.tsx`

- [ ] **Step 1: Load user email in app layout**

Use the server Supabase client to call `auth.getUser()` and pass `user.email` into `AppShell`.

- [ ] **Step 2: Pass email through shell/sidebar**

Add `userEmail?: string | null` props through `AppShell` and `AppSidebar`.

- [ ] **Step 3: Add sign-out form**

`SidebarUser` renders the user email and a compact POST form to `/auth/sign-out` using a `LogOutIcon`.

---

### Task 9: Update Env Docs And README

**Files:**
- Modify: `apps/web/.env.example`
- Modify: `README.md`

- [ ] **Step 1: Update app env example**

Use:

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-anon-or-publishable-key-from-pnpm-supabase-status
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key-from-pnpm-supabase-status
```

- [ ] **Step 2: Update README**

Document:

```bash
pnpm supabase:start
pnpm supabase:status
pnpm supabase:reset
pnpm supabase:types
pnpm dev
```

and note local magic-link emails are available in Inbucket.

---

### Task 10: Verify

**Files:**
- Review all touched files.

- [ ] **Step 1: Run focused tests**

Run:

```bash
pnpm test -F web
```

Expected: web tests pass.

- [ ] **Step 2: Run full verification**

Run:

```bash
pnpm test
pnpm lint
pnpm typecheck
pnpm build
```

Expected: all commands pass, or any failure is documented with the exact cause.

- [ ] **Step 3: Review git diff**

Run:

```bash
git status --short
git diff --stat
```

Expected: only Supabase auth implementation, tests, env docs, README, and plan/spec updates are changed.
