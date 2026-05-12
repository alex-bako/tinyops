import { describe, expect, it } from "vitest"

import { createDeployHealthCheck } from "@/features/deploy/application"

describe("deploy health application", () => {
  it("reports ok when every deploy health probe succeeds", async () => {
    const health = createDeployHealthCheck({
      supabase: { check: async () => true },
    })

    await expect(health.check()).resolves.toEqual({
      status: "ok",
      checks: { supabase: "ok" },
    })
  })

  it("reports unavailable when the Supabase deploy health probe fails", async () => {
    const health = createDeployHealthCheck({
      supabase: { check: async () => false },
    })

    await expect(health.check()).resolves.toEqual({
      status: "unavailable",
      checks: { supabase: "error" },
    })
  })

  it("reports unavailable when the Supabase deploy health probe throws", async () => {
    const health = createDeployHealthCheck({
      supabase: {
        check: async () => {
          throw new Error("connection failed")
        },
      },
    })

    await expect(health.check()).resolves.toEqual({
      status: "unavailable",
      checks: { supabase: "error" },
    })
  })
})
