# Supabase Auth And Local Development Design

Date: 2026-05-09
Project: TinyOps
Status: Approved for implementation planning

## Context

TinyOps is a pnpm/Turborepo monorepo with a Next.js App Router web app in
`apps/web`, shared UI in `packages/ui`, and an existing `supabase/` directory
containing local CLI configuration and a seed file. The current login page is
styled but does not send real authentication requests. The app also has a
protected application route group at `apps/web/app/(app)`, but no Supabase
session enforcement yet.

The goal is to set up the current Supabase installation pattern for local and
future hosted development, then scaffold a basic invite-only authentication
system.

## Decisions

- Use Supabase Auth with magic-link sign-in as the only active login method.
- Enforce invite-only access with a database allowlist.
- Include `public.profiles` as the app-facing user record.
- Hide the existing Google and password controls without deleting their code.
- Keep manual end-to-end Supabase verification as a user-run step.
- Add automated integration tests where the app/server boundary can be tested
  without requiring the full Docker-based Supabase stack.

## Architecture

The web app will use `@supabase/supabase-js` and `@supabase/ssr`. Supabase
client helpers will live under `apps/web/lib/supabase/`:

- `browser.ts` creates the browser client for client components.
- `server.ts` creates the server client for server components, route handlers,
  and server actions.
- `admin.ts` creates a server-only admin client for invite checks and profile
  maintenance.
- `proxy.ts` contains the cookie-aware session refresh and route protection
  helper used by the app-level Next proxy.

The Next.js root `proxy.ts` will refresh Supabase Auth tokens on requests and
enforce route access:

- `/login` and `/auth/callback` stay public.
- routes under the app shell, including `/home`, require an authenticated user.
- authenticated users visiting `/login` redirect to `/home`.
- unauthenticated users visiting protected routes redirect to `/login`.

The app must only expose public Supabase environment variables to the browser:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

The app will also use this server-only variable:

- `SUPABASE_SERVICE_ROLE_KEY`

The service-role key is used only by server-side code in `admin.ts`; it must not
be prefixed with `NEXT_PUBLIC_`, imported by client components, or sent to the
browser. Local development can source this value from `pnpm supabase:status`.

## Data Model

The first migration will add `public.auth_invites` and `public.profiles`.

`public.auth_invites`:

- `email text primary key`
- email values are stored normalized as lowercase trimmed addresses.
- `accepted_at timestamptz null`
- `created_at timestamptz not null default now()`
- RLS enabled.
- client-side insert/update/delete is not allowed.
- client-side select is not allowed.
- server-side invite checks use the server-only admin client.

`public.profiles`:

- `id uuid primary key references auth.users(id) on delete cascade`
- `email text not null`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`
- RLS enabled.
- users may read their own profile.
- users may not create arbitrary profiles from the client.

The seed file will insert at least one local allowed email into
`public.auth_invites` so local development can complete the login flow after
`pnpm supabase:reset`.

## Database Privileges

The admin (`service_role`) client reads/writes some tables directly via
`.from(...)` — the invite lookup and `accepted_at` update on `auth_invites`, the
profile upsert on `profiles`, and the sync worker's read of `data_sources`.

Supabase auto-grants DML to the API roles (`anon`/`authenticated`/`service_role`)
only for objects created by the `supabase_admin` role. Our migrations run as the
`postgres` role, whose default ACL grants those roles **no** SELECT/INSERT/
UPDATE/DELETE. So a migration-created table is, by default, inaccessible to the
admin client and direct reads fail with `42501 permission denied` — the original
cause of "Could not send a sign-in link" and "Could not upsert profile".

The fix is the foundation migration
`supabase/migrations/20260101000000_role_privilege_defaults.sql`. It is
timestamped to run before any `create table` and uses `ALTER DEFAULT PRIVILEGES
FOR ROLE postgres` to grant `service_role` full DML (plus sequence/function
access) on every table created by later migrations. `service_role` is the
trusted, server-only role (`rolbypassrls = true`, never shipped to the browser),
so this is safe and mirrors Supabase's intended posture.

`authenticated` is **not** widened by that migration. It is an untrusted,
browser-facing role, so it gets the **least privilege** its RLS policies declare,
not a blanket grant — a fail-closed posture (forget a grant and a feature breaks
visibly, rather than a blanket grant silently exposing data). A policy without a
matching table/column grant is **dead** (grants nothing); the missing backing
grants were the cause of the post-login `42501` on `public.profiles`. The grants
live in one place for a single audit surface:
`supabase/migrations/20260604000000_authenticated_table_grants.sql`, one
`grant <privs> ... to authenticated` per table mirroring that table's policy
commands (an `ALL` policy ⇒ select/insert/update/delete). Row access stays gated
by RLS.

`public.data_source_secrets` is the deliberate exception: it keeps a
**column-level** SELECT grant exposing masked metadata while hiding the
`vault_secret_id` Vault pointer. It must never receive a table-level grant.

`anon` gets nothing — it has no RLS policies. `auth_invites` has RLS enabled with
no client policy, so it stays fully closed to `anon`/`authenticated` (the
service_role admin client reads it instead).

Two CI contract tests guard this:
- `supabase/tests/service_role_privileges_contract.sql` — asserts the auth/worker
  tables are reachable by `service_role` and that a freshly created table
  auto-inherits `service_role` DML (the default-privilege foundation works).
- `supabase/tests/rls_grant_invariants_contract.sql` — the durable invariant:
  **every** RLS policy on `anon`/`authenticated` has a backing grant (no dead
  policies), plus negative checks that `vault_secret_id` and `auth_invites` stay
  closed. A future table that adds a policy but forgets the grant fails CI.

Rule of thumb for new tables: `service_role` needs nothing (it inherits DML);
`authenticated` needs an explicit grant matching every policy you add for it.

## Invite Enforcement

Invite-only access is enforced in two layers.

First, the login server action normalizes the submitted email and checks
`public.auth_invites`. If no row exists, the action returns a neutral
invite-only response and does not call Supabase Auth.

Second, `supabase/config.toml` will enable the Supabase
`auth.hook.before_user_created` hook and point it at a Postgres function. That
function normalizes the Auth event email, checks `public.auth_invites`, returns
the event when invited, and rejects the event when no invite exists. This
prevents users from bypassing the app by calling Supabase Auth endpoints
directly.

On successful session creation, the app creates or updates the matching
`public.profiles` row and marks the invite's `accepted_at` if it was null.

## Auth Flow

1. User enters an email address on `/login`.
2. A server action normalizes the email.
3. The action checks `public.auth_invites` through the server-only admin client.
4. If the email is not invited, the page shows a neutral invite-only message.
5. If invited, the action calls Supabase `signInWithOtp` with a redirect to
   `/auth/callback`.
6. In local development, Supabase sends the email to Inbucket.
7. `/auth/callback` exchanges the code for a session.
8. The callback upserts `public.profiles`, marks the invite accepted, and
   redirects to `/home`.
9. Protected route requests use the refreshed Supabase session.
10. Sign-out clears the session and returns the user to `/login`.

## UX And Errors

The active login UI will only show the magic-link form. Existing Google and
password controls remain in the source but are hidden from the rendered flow
until those providers are implemented.

Errors should be safe and specific enough to guide the user:

- Uninvited email: show a neutral invite-only message.
- Magic-link send failure: show a retryable "could not send link" state.
- Expired or invalid callback: redirect to `/login` with a "link expired,
  request a new one" state.
- Already signed in on `/login`: redirect to `/home`.
- Signed out on protected routes: redirect to `/login`.

The uninvited email message should not reveal whether the address exists in any
other system.

## Local Development

The repository will document the development loop:

1. `pnpm install`
2. `pnpm supabase:start`
3. copy `apps/web/.env.example` to `apps/web/.env.local`
4. set the Supabase URL, publishable key, and service-role key from
   `pnpm supabase:status`
5. `pnpm supabase:reset`
6. `pnpm supabase:types`
7. `pnpm dev`

Local email testing happens through Supabase Inbucket. Hosted project linking,
remote migrations, and production SMTP are out of scope for this first auth
scaffold, but the local layout should remain compatible with those steps.

## Automated Testing

Automated tests should cover the app code paths that can be exercised without a
running local Supabase stack:

- email normalization.
- invite lookup behavior for allowed and uninvited emails.
- login action behavior for allowed emails, uninvited emails, and Supabase
  failures using mocked Supabase clients.
- auth callback behavior for successful exchange and invalid/expired code when
  exercised through an exported route handler helper.
- proxy redirect behavior for public, protected, authenticated, and
  unauthenticated requests through an exported proxy helper.

Integration tests apply at the Next app boundary by mocking Supabase clients and
asserting server-action, route-handler, and middleware behavior together. Full
Docker-backed Supabase end-to-end verification is intentionally manual for this
phase.

The verification baseline remains:

- `pnpm test`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm build`

## Manual Verification

The user will run manual verification:

1. start local Supabase.
2. reset the local database.
3. start the web app.
4. request a magic link for the seeded invited email.
5. open the link from Inbucket.
6. confirm `/home` loads.
7. confirm `/login` redirects when already signed in.
8. sign out and confirm protected routes redirect to `/login`.
9. try an uninvited email and confirm no link is sent.

## Out Of Scope

- Google OAuth.
- password sign-in.
- passkeys or MFA.
- production SMTP setup.
- hosted Supabase project creation or linking.
- workspace/team membership beyond the single-user `profiles` scaffold.
- invite management UI.
