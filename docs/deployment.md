# TinyOps Deployment

## Strategy

- `main` is staging.
- Production deploys only from pushed `v*` tags.
- Vercel runs the Next.js app, API routes, and cron worker.
- Supabase runs Auth, Postgres, Realtime, and RPC migrations.
- Use two Vercel projects and two Supabase projects:
  - `tinyops-staging`
  - `tinyops-prod`

## GitHub Environments

Create `staging` and `production` GitHub environments.

Use the same secret names in both environments:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_DB_PASSWORD`
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `DEPLOY_HEALTH_SECRET`

Require approval on the `production` environment. Keep `staging` approval-free.

Protect `main` with required PR checks:

- `App checks`
- `Supabase contracts`

## Vercel Projects

Create one Vercel project per environment. Set each project root directory to
`apps/web`.

Configure runtime env vars in each Vercel project:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SYNC_WORKER_SECRET`
- `CRON_SECRET`
- `DEPLOY_HEALTH_SECRET`
- `TINYOPS_APP_BASE_URL`
- `TINYOPS_DEPLOY_ENV`
- `TINYOPS_LOG_LEVEL`
- `OPENAI_API_KEY` (only needed for the "Ask AI" feature)
- `ASK_AI_MODEL` (optional; defaults to `gpt-5.5`)
- `GOOGLE_SERVICE_ACCOUNT_KEY` (only needed for Google Forms live sync; see
  below)

Set `TINYOPS_DEPLOY_ENV=staging` in `tinyops-staging` and
`TINYOPS_DEPLOY_ENV=production` in `tinyops-prod`.

Cron schedule comes from `apps/web/vercel.ts`. Each tick enqueues every idle
connector (steady-state incremental sync) and drains the queue:

- staging: every 30 minutes, `*/30 * * * *`
- production: every 30 minutes, `*/30 * * * *`

## Google Forms Live Sync

Live sync reads responses through the Google Forms API as a Google service
account. Manual CSV upload keeps working without it.

1. In Google Cloud Console pick or create a project and enable the
   **Google Forms API**.
2. Create a service account (IAM & Admin → Service Accounts). It needs no
   project roles.
3. Create a JSON key for the service account and download it.
4. Set `GOOGLE_SERVICE_ACCOUNT_KEY` to the key file content in `.env.local`
   and in each Vercel project. Paste the JSON on one line, or base64-encode
   the whole file; both are accepted.
5. Form owners share each form with the service account address (the
   `client_email` in the key) as an editor. The Google Forms connect page
   shows this address, checks access, and lists the form questions so the
   client-email question can be picked when the form does not collect emails.

Each sync drain tick then pulls new and edited responses for every connected
live form. A Google Workspace domain that blocks sharing outside the
organization must allow the service account address.

## Supabase Projects

Use the existing Supabase project for staging. Create a fresh project for prod.

Configure Auth site URL and redirect allowlist:

- `https://tinyops-staging.vercel.app/auth/callback`
- `https://tinyops-prod.vercel.app/auth/callback`

Do not run `supabase config push` yet. Current `supabase/config.toml` is local
development oriented.

### Invite and sign-in email (M1.S1)

Supabase's built-in mailer only delivers to members of the Supabase
organisation, so real invitees never receive invite or magic-link email until
the hosted project has custom SMTP. Do this on staging first, then production.
Everything below is dashboard configuration; nothing is committed to the repo
and no SMTP credential ever goes into `supabase/config.toml` or an env file.

1. **Custom SMTP** — Supabase dashboard → Project Settings → Authentication →
   SMTP Settings. Enter the provider's host, port, username and password, plus
   a sender address on a domain you control. Any provider works (Resend,
   Postmark, SendGrid, ...). Raise the auth rate limit for emails if the
   default (a few per hour) is too low for testing.
2. **Email templates** — Authentication → Email Templates. Paste the local
   templates so hosted links match what `/auth/callback` verifies:
   - *Invite user*: `supabase/templates/invite.html`
   - *Magic Link*: `supabase/templates/magic-link.html`

   Both link to `{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=...`.
   The app always passes a `redirectTo` that already carries `?next=`, so the
   `&` is safe. Do not use `{{ .ConfirmationURL }}`: links generated for
   invitees (and the copyable invite link) have no PKCE verifier in the
   invitee's browser, and that URL would drop them on `/login?auth=expired`.
   The callback still accepts `?code=` links, so switching the templates
   does not break sign-in for users mid-flow.
3. **Redirect allowlist** — Authentication → URL Configuration. Add
   `https://tinyops-staging.vercel.app/auth/callback**` and
   `https://tinyops-prod.vercel.app/auth/callback**` next to the existing bare
   entries. App links always carry `?next=`, and if hosted GoTrue rejects the
   redirect it falls back to the site URL, where a `token_hash` link cannot
   be recovered (only `?code=` links are rescued from the root).
4. **Verify on staging** — invite a mailbox outside the Supabase organisation
   from Settings → Members. The email must arrive, its link must land on
   `/join`, and Accept must add the member. Then repeat with an address that
   already has a TinyOps account: it receives a sign-in link and joins the
   workspace under its existing account. "Copy link" on the pending row must
   produce the same kind of link without email. Invite from the app, not from
   the dashboard's "Invite user": a dashboard invite passes no redirect, so the
   pasted templates render a broken `https://<host>&token_hash=...` link. It
   proves SMTP delivery only.

Until step 1 is done, invites are still saved and the inviter sees "Invite
saved, email not sent"; "Copy link" works regardless of SMTP.

## Release Flow

1. Open PR to `main`.
2. Required CI runs app checks and local Supabase contracts.
3. Merge to `main`.
4. `Deploy staging` runs migrations with seed, deploys Vercel staging, then calls
   `/api/health`.
5. Create a version tag on a known-good `main` commit:

```bash
git tag v0.1.0 <sha>
git push origin v0.1.0
```

6. `Deploy production` verifies the tag commit is on `main`, waits for GitHub
   production approval, runs migrations without seed, deploys Vercel prod, then
   calls `/api/health`.

The staging and production workflows call one reusable deploy workflow. Keep
environment differences in the caller inputs; keep shared deploy mechanics in
the reusable workflow.

## Migration Policy

Automated deploys assume expand-contract migrations.

Allowed automatically:

- Add nullable columns.
- Add tables, indexes, policies, and RPCs without breaking old app versions.
- Backfill in bounded, retryable steps.

Manual staged release required:

- Dropping columns/tables.
- Renaming columns/tables/RPCs.
- Tightening constraints on existing data.
- Any migration that old app code cannot survive.

Rollback app releases through Vercel. Roll database mistakes forward with a new
migration.
