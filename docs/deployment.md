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

Set `TINYOPS_DEPLOY_ENV=staging` in `tinyops-staging` and
`TINYOPS_DEPLOY_ENV=production` in `tinyops-prod`.

Cron schedule comes from `apps/web/vercel.ts`:

- staging: hourly, `0 * * * *`
- production: minutely, `* * * * *`

## Supabase Projects

Use the existing Supabase project for staging. Create a fresh project for prod.

Configure Auth site URL and redirect allowlist:

- `https://tinyops-staging.vercel.app/auth/callback`
- `https://tinyops-prod.vercel.app/auth/callback`

Do not run `supabase config push` yet. Current `supabase/config.toml` is local
development oriented.

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
