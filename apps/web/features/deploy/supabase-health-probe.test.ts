import { describe, expect, it } from "vitest"

import { createSupabaseDeployHealthProbe } from "@/features/deploy/supabase-health-probe"

describe("Supabase deploy health probe adapter", () => {
  it("checks Supabase through the deploy health RPC", async () => {
    const calls: Array<{ fn: string; args: unknown }> = []
    const probe = createSupabaseDeployHealthProbe({
      client: {
        async rpc(fn, args) {
          calls.push({ fn, args })
          return { data: true, error: null }
        },
      },
    })

    await expect(probe.check()).resolves.toBe(true)
    expect(calls).toEqual([{ fn: "deploy_health_check", args: {} }])
  })

  it("fails closed for RPC errors, false responses, and thrown exceptions", async () => {
    await expect(
      createSupabaseDeployHealthProbe({
        client: {
          async rpc() {
            return { data: null, error: { message: "db unavailable" } }
          },
        },
      }).check()
    ).resolves.toBe(false)
    await expect(
      createSupabaseDeployHealthProbe({
        client: {
          async rpc() {
            return { data: false, error: null }
          },
        },
      }).check()
    ).resolves.toBe(false)
    await expect(
      createSupabaseDeployHealthProbe({
        client: {
          async rpc() {
            throw new Error("network")
          },
        },
      }).check()
    ).resolves.toBe(false)
  })
})
