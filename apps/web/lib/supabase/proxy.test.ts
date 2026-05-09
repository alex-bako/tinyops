import { describe, expect, it } from "vitest"

import {
  isProtectedPath,
  isPublicAuthPath,
  resolveMagicLinkCodeRedirect,
  resolveAuthRedirect,
} from "@/lib/supabase/proxy"

describe("proxy route decisions", () => {
  it("identifies protected app paths", () => {
    expect(isProtectedPath("/home")).toBe(true)
    expect(isProtectedPath("/home/clients")).toBe(true)
    expect(isProtectedPath("/login")).toBe(false)
  })

  it("identifies public auth paths", () => {
    expect(isPublicAuthPath("/login")).toBe(true)
    expect(isPublicAuthPath("/auth/callback")).toBe(true)
    expect(isPublicAuthPath("/home")).toBe(false)
  })

  it("redirects signed-out users away from protected paths", () => {
    expect(resolveAuthRedirect({ pathname: "/home", hasUser: false })).toBe(
      "/login"
    )
  })

  it("redirects signed-in users away from login", () => {
    expect(resolveAuthRedirect({ pathname: "/login", hasUser: true })).toBe(
      "/home"
    )
  })

  it("allows signed-in users on protected paths", () => {
    expect(resolveAuthRedirect({ pathname: "/home", hasUser: true })).toBeNull()
  })

  it("forwards root magic-link code redirects to the auth callback route", () => {
    expect(resolveMagicLinkCodeRedirect("/", "?code=abc123")).toBe(
      "/auth/callback?code=abc123"
    )
  })

  it("ignores non-root code query strings", () => {
    expect(resolveMagicLinkCodeRedirect("/login", "?code=abc123")).toBeNull()
  })
})
