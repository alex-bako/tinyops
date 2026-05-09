import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { getSupabasePublicEnv } from "@/lib/supabase/public-env"
import { getSupabaseServerEnv } from "@/lib/supabase/server-env"

const ORIGINAL_ENV = process.env

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

  it("keeps service-role reads behind the server env adapter", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = " https://example.supabase.co "
    process.env.SUPABASE_SERVICE_ROLE_KEY = " service-role "

    expect(getSupabaseServerEnv()).toEqual({
      url: "https://example.supabase.co",
      serviceRoleKey: "service-role",
    })
  })
})
