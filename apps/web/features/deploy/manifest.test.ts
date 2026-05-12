import { describe, expect, it } from "vitest"

import {
  createVercelConfig,
  DEPLOY_BUILD_ENV,
  DEPLOY_ENVIRONMENTS,
  DEPLOY_GITHUB_SECRETS,
  DEPLOY_RUNTIME_ENV,
  DEPLOY_ROUTES,
  DEPLOY_TOOL_VERSIONS,
  parseDeployEnv,
} from "@/features/deploy/manifest"

describe("deploy manifest", () => {
  it("defines deploy environments, routes, schedules, secrets, and CI versions in one place", () => {
    expect(DEPLOY_ENVIRONMENTS).toEqual({
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
    })
    expect(DEPLOY_ROUTES).toEqual({
      health: "/api/health",
      syncDrain: "/api/sync/drain",
    })
    expect(DEPLOY_GITHUB_SECRETS).toEqual([
      "SUPABASE_ACCESS_TOKEN",
      "SUPABASE_PROJECT_REF",
      "SUPABASE_DB_PASSWORD",
      "VERCEL_TOKEN",
      "VERCEL_ORG_ID",
      "VERCEL_PROJECT_ID",
      "DEPLOY_HEALTH_SECRET",
    ])
    expect(DEPLOY_RUNTIME_ENV).toContain("TINYOPS_DEPLOY_ENV")
    expect(DEPLOY_BUILD_ENV.TINYOPS_DEPLOY_ENV).toBe("staging")
    expect(DEPLOY_TOOL_VERSIONS).toEqual({
      node: "20",
      pnpm: "10.18.3",
      supabaseCli: "2.98.2",
      vercelCli: "47.0.5",
    })
  })

  it("creates Vercel cron config from the deploy manifest", () => {
    expect(createVercelConfig("staging").crons).toEqual([
      { path: "/api/sync/drain", schedule: "0 * * * *" },
    ])
    expect(createVercelConfig("production").crons).toEqual([
      { path: "/api/sync/drain", schedule: "* * * * *" },
    ])
  })

  it("parses deploy env explicitly", () => {
    expect(parseDeployEnv(" staging ")).toBe("staging")
    expect(parseDeployEnv("PRODUCTION")).toBe("production")
    expect(() => parseDeployEnv(undefined)).toThrow(
      "TINYOPS_DEPLOY_ENV must be set to either staging or production"
    )
  })
})
