import { describe, expect, it } from "vitest"

import { normalizeEmail } from "@/lib/auth/email"

describe("normalizeEmail", () => {
  it("trims and lowercases valid email addresses", () => {
    expect(normalizeEmail(" Anna@Example.CO ")).toBe("anna@example.co")
  })

  it("rejects strings that are not email addresses", () => {
    expect(normalizeEmail("not-email")).toBeNull()
  })

  it("rejects nullish values", () => {
    expect(normalizeEmail(null)).toBeNull()
    expect(normalizeEmail(undefined)).toBeNull()
  })
})
