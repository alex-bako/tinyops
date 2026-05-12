import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createDeployHealthRuntime: vi.fn(),
  check: vi.fn(),
}))

vi.mock("@/lib/supabase/server-env", () => ({
  getDeployHealthSecret: () => "health-secret",
}))

vi.mock("@/features/deploy/adapters/health-runtime", () => ({
  createDeployHealthRuntime: mocks.createDeployHealthRuntime,
}))

import { GET } from "./route"

function healthRequest(secret = "health-secret") {
  return new Request("https://app.example.com/api/health", {
    method: "GET",
    headers: { authorization: `Bearer ${secret}` },
  })
}

describe("deploy health route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createDeployHealthRuntime.mockReturnValue({ check: mocks.check })
    mocks.check.mockResolvedValue({
      status: "ok",
      checks: { supabase: "ok" },
    })
  })

  it("rejects requests without the deploy health bearer secret", async () => {
    const response = await GET(healthRequest("wrong"))

    await expect(response.json()).resolves.toEqual({ error: "unauthorized" })
    expect(response.status).toBe(401)
    expect(mocks.createDeployHealthRuntime).not.toHaveBeenCalled()
    expect(mocks.check).not.toHaveBeenCalled()
  })

  it("returns ok when Supabase is reachable", async () => {
    const response = await GET(healthRequest())

    await expect(response.json()).resolves.toEqual({
      status: "ok",
      checks: { supabase: "ok" },
    })
    expect(response.status).toBe(200)
    expect(mocks.createDeployHealthRuntime).toHaveBeenCalledTimes(1)
    expect(mocks.check).toHaveBeenCalledTimes(1)
  })

  it("returns unavailable when Supabase cannot be reached", async () => {
    mocks.check.mockResolvedValue({
      status: "unavailable",
      checks: { supabase: "error" },
    })

    const response = await GET(healthRequest())

    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      checks: { supabase: "error" },
    })
    expect(response.status).toBe(503)
  })
})
