import { afterEach, beforeEach, describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import path from "node:path"

import { getSupabasePublicEnv } from "@/lib/supabase/public-env"
import {
  getCronSecret,
  getDeployHealthSecret,
  getOptionalTinyOpsAppBaseUrl,
  getSupabaseServerEnv,
} from "@/lib/supabase/server-env"

const ORIGINAL_ENV = process.env

function setEnv(name: string, value: string) {
  process.env[name] = value
}

describe("Supabase env adapters", () => {
  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV }
  })

  afterEach(() => {
    process.env = ORIGINAL_ENV
  })

  it("trims public Supabase environment values", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co "
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = " publishable "

    expect(getSupabasePublicEnv()).toEqual({
      url: "https://example.supabase.co",
      publishableKey: "publishable",
    })
  })

  it("throws a clear error when a public Supabase value is missing", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "publishable"

    expect(() => getSupabasePublicEnv()).toThrow(
      "Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL"
    )
  })

  it("uses direct public env references so Next.js can inline client values", () => {
    const source = readFileSync(
      path.join(process.cwd(), "lib", "supabase", "public-env.ts"),
      "utf8"
    )

    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL")
    expect(source).toContain("process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  })

  it("keeps service-role reads behind the server env adapter", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co "
    setEnv("SUPABASE_SERVICE_ROLE_KEY", " service-role ")

    expect(getSupabaseServerEnv()).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role",
    })
  })

  it("reads the cron secret through the server env adapter", () => {
    setEnv("CRON_SECRET", " cron-secret ")

    expect(getCronSecret()).toBe("cron-secret")
  })

  it("reads the deploy health secret through the server env adapter", () => {
    setEnv("DEPLOY_HEALTH_SECRET", " deploy-health-secret ")

    expect(getDeployHealthSecret()).toBe("deploy-health-secret")
  })

  it("reads an optional trusted app base URL for server-side worker dispatch", () => {
    setEnv("TINYOPS_APP_BASE_URL", " https://app.example.com ")

    expect(getOptionalTinyOpsAppBaseUrl()).toBe("https://app.example.com")

    delete process.env.TINYOPS_APP_BASE_URL
    expect(getOptionalTinyOpsAppBaseUrl()).toBeNull()
  })
})
