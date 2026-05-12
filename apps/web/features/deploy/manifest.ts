export type TinyOpsDeployEnv = "staging" | "production"

export type VercelCron = {
  path: string
  schedule: string
}

export type VercelConfig = {
  crons: VercelCron[]
}

export const DEPLOY_ROUTES = {
  health: "/api/health",
  syncDrain: "/api/sync/drain",
} as const

export const DEPLOY_ENVIRONMENTS = {
  staging: {
    githubEnvironment: "staging",
    includeSeed: true,
    requiresTagOnMain: false,
    syncDrainSchedule: "0 * * * *",
  },
  production: {
    githubEnvironment: "production",
    includeSeed: false,
    requiresTagOnMain: true,
    syncDrainSchedule: "* * * * *",
  },
} as const satisfies Record<
  TinyOpsDeployEnv,
  {
    githubEnvironment: TinyOpsDeployEnv
    includeSeed: boolean
    requiresTagOnMain: boolean
    syncDrainSchedule: string
  }
>

export const DEPLOY_GITHUB_SECRETS = [
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_REF",
  "SUPABASE_DB_PASSWORD",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID",
  "DEPLOY_HEALTH_SECRET",
] as const

export const DEPLOY_RUNTIME_ENV = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SYNC_WORKER_SECRET",
  "CRON_SECRET",
  "DEPLOY_HEALTH_SECRET",
  "TINYOPS_APP_BASE_URL",
  "TINYOPS_DEPLOY_ENV",
  "TINYOPS_LOG_LEVEL",
] as const

export const DEPLOY_BUILD_ENV = {
  TINYOPS_DEPLOY_ENV: "staging",
  NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "ci-publishable-key",
  SUPABASE_SERVICE_ROLE_KEY: "ci-service-role-key",
  SYNC_WORKER_SECRET: "ci-sync-secret",
  CRON_SECRET: "ci-cron-secret",
  DEPLOY_HEALTH_SECRET: "ci-health-secret",
  TINYOPS_APP_BASE_URL: "http://localhost:3000",
  TINYOPS_LOG_LEVEL: "debug",
} as const

export const DEPLOY_TOOL_VERSIONS = {
  node: "20",
  pnpm: "10.18.3",
  supabaseCli: "2.98.2",
  vercelCli: "47.0.5",
} as const

export function createVercelConfig(
  deployEnv = process.env.TINYOPS_DEPLOY_ENV
): VercelConfig {
  const env = parseDeployEnv(deployEnv)

  return {
    crons: [
      {
        path: DEPLOY_ROUTES.syncDrain,
        schedule: DEPLOY_ENVIRONMENTS[env].syncDrainSchedule,
      },
    ],
  }
}

export function parseDeployEnv(value: string | undefined): TinyOpsDeployEnv {
  const normalized = value?.trim().toLowerCase()
  if (normalized === "staging" || normalized === "production") {
    return normalized
  }

  throw new Error(
    "TINYOPS_DEPLOY_ENV must be set to either staging or production"
  )
}
