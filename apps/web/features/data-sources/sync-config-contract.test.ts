import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

describe("sync deployment configuration", () => {
  it("defines the Vercel cron drain route", () => {
    const vercel = JSON.parse(
      readFileSync(path.join(process.cwd(), "..", "..", "vercel.json"), "utf8")
    ) as { crons?: Array<{ path: string; schedule: string }> }

    expect(vercel.crons).toContainEqual({
      path: "/api/sync/drain",
      schedule: "* * * * *",
    })
  })

  it("documents worker, cron, and trusted dispatch origin config in example env files", () => {
    const rootEnv = readFileSync(
      path.join(process.cwd(), "..", "..", ".env.example"),
      "utf8"
    )
    const webEnv = readFileSync(path.join(process.cwd(), ".env.example"), "utf8")

    expect(rootEnv).toContain("SYNC_WORKER_SECRET=")
    expect(rootEnv).toContain("CRON_SECRET=")
    expect(rootEnv).toContain("TINYOPS_APP_BASE_URL=")
    expect(webEnv).toContain("SYNC_WORKER_SECRET=")
    expect(webEnv).toContain("CRON_SECRET=")
    expect(webEnv).toContain("TINYOPS_APP_BASE_URL=")
  })
})
