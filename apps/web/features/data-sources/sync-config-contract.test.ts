import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"

import {
  createVercelConfig,
  DEPLOY_BUILD_ENV,
  DEPLOY_ENVIRONMENTS,
  DEPLOY_GITHUB_SECRETS,
  DEPLOY_ROUTES,
  DEPLOY_RUNTIME_ENV,
  DEPLOY_TOOL_VERSIONS,
} from "@/features/deploy/manifest"

function repoPath(...parts: string[]) {
  return path.join(process.cwd(), "..", "..", ...parts)
}

function readRepoFile(...parts: string[]) {
  return readFileSync(repoPath(...parts), "utf8")
}

function readWorkflow(name: string) {
  return parse(readRepoFile(".github", "workflows", name)) as Record<
    string,
    unknown
  >
}

describe("sync deployment configuration", () => {
  it("keeps Vercel config in the app project root", () => {
    expect(existsSync(path.join(process.cwd(), "vercel.ts"))).toBe(true)
    expect(existsSync(repoPath("vercel.json"))).toBe(false)
  })

  it("defines environment-specific Vercel cron schedules from the deploy manifest", () => {
    expect(createVercelConfig("staging").crons).toContainEqual({
      path: DEPLOY_ROUTES.syncDrain,
      schedule: DEPLOY_ENVIRONMENTS.staging.syncDrainSchedule,
    })
    expect(createVercelConfig("production").crons).toContainEqual({
      path: DEPLOY_ROUTES.syncDrain,
      schedule: DEPLOY_ENVIRONMENTS.production.syncDrainSchedule,
    })
  })

  it("documents worker, cron, and trusted dispatch origin config in example env files", () => {
    const rootEnv = readRepoFile(".env.example")
    const webEnv = readFileSync(path.join(process.cwd(), ".env.example"), "utf8")

    for (const name of DEPLOY_RUNTIME_ENV) {
      expect(rootEnv).toContain(`${name}=`)
      expect(webEnv).toContain(`${name}=`)
    }
  })

  it("keeps docs aligned with the deploy manifest", () => {
    const docs = readRepoFile("docs", "deployment.md")

    for (const secretName of DEPLOY_GITHUB_SECRETS) {
      expect(docs).toContain(secretName)
    }
    for (const envName of DEPLOY_RUNTIME_ENV) {
      expect(docs).toContain(envName)
    }
    expect(docs).toContain(DEPLOY_ENVIRONMENTS.staging.syncDrainSchedule)
    expect(docs).toContain(DEPLOY_ENVIRONMENTS.production.syncDrainSchedule)
    expect(docs).toContain(DEPLOY_ROUTES.health)
  })

  it("keeps reusable deploy workflows aligned with the deploy manifest", () => {
    const reusable = readWorkflow("deploy-environment.yml")
    const staging = readWorkflow("deploy-staging.yml")
    const production = readWorkflow("deploy-production.yml")

    expect(reusable.on).toHaveProperty("workflow_call")
    expect(reusable).toMatchObject({
      env: {
        NODE_VERSION: DEPLOY_TOOL_VERSIONS.node,
        PNPM_VERSION: DEPLOY_TOOL_VERSIONS.pnpm,
        SUPABASE_CLI_VERSION: DEPLOY_TOOL_VERSIONS.supabaseCli,
        VERCEL_CLI_VERSION: DEPLOY_TOOL_VERSIONS.vercelCli,
      },
    })
    expect(
      JSON.stringify(reusable)
    ).toContain(DEPLOY_ROUTES.health)
    expect(JSON.stringify(reusable)).toContain("DEPLOY_HEALTH_SECRET")

    expect(staging).toMatchObject({
      jobs: {
        deploy: {
          uses: "./.github/workflows/deploy-environment.yml",
          with: {
            "deploy-env": "staging",
            "include-seed": true,
            "require-tag-on-main": false,
          },
          secrets: "inherit",
        },
      },
    })
    expect(production).toMatchObject({
      jobs: {
        deploy: {
          uses: "./.github/workflows/deploy-environment.yml",
          with: {
            "deploy-env": "production",
            "include-seed": false,
            "require-tag-on-main": true,
          },
          secrets: "inherit",
        },
      },
    })
  })

  it("keeps Turborepo env hashing narrow", () => {
    const turbo = JSON.parse(readRepoFile("turbo.json")) as {
      globalEnv?: string[]
      tasks?: { build?: { env?: string[] }; dev?: { passThroughEnv?: string[] } }
    }

    expect(turbo.globalEnv).toEqual(["NODE_ENV"])
    expect(turbo.tasks?.build?.env).toEqual(DEPLOY_RUNTIME_ENV)
    expect(turbo.tasks?.dev?.passThroughEnv).toEqual(DEPLOY_RUNTIME_ENV)
    expect(turbo.tasks?.build?.env).toContain("DEPLOY_HEALTH_SECRET")
    expect(turbo.globalEnv).not.toContain("DEPLOY_HEALTH_SECRET")
  })

  it("keeps CI build env aligned with the deploy manifest", () => {
    const ci = readWorkflow("ci.yml")

    expect(JSON.stringify(ci)).toContain(JSON.stringify(DEPLOY_BUILD_ENV))
  })
})
