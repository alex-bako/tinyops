import { describe, expect, it } from "vitest"

import { APP_ROUTES } from "@/lib/navigation"
import {
  AUTH_CALLBACK_PATH,
  DEFAULT_SIGNED_IN_PATH,
  LOGIN_PATH,
  buildAuthCallbackUrl,
  isProtectedPath,
  isPublicAuthPath,
  resolveAuthRedirect,
  resolveMagicLinkCodeRedirect,
  safeSignedInPath,
} from "@/lib/auth/route-policy"

describe("route policy", () => {
  it("keeps every navigation app route behind signed-in protection", () => {
    expect(APP_ROUTES.map((route) => route.href)).not.toHaveLength(0)
    expect(APP_ROUTES.every((route) => isProtectedPath(route.href))).toBe(true)
  })

  it("only treats auth entry routes as public auth paths", () => {
    expect(isPublicAuthPath(LOGIN_PATH)).toBe(true)
    expect(isPublicAuthPath(AUTH_CALLBACK_PATH)).toBe(true)
    expect(isPublicAuthPath("/auth/sign-out")).toBe(false)
    expect(isPublicAuthPath(DEFAULT_SIGNED_IN_PATH)).toBe(false)
  })

  it("only allows signed-in app paths for safe redirects", () => {
    expect(safeSignedInPath("/home/clients?filter=active#recent")).toBe(
      "/home/clients?filter=active#recent"
    )
    expect(safeSignedInPath("/login")).toBe(DEFAULT_SIGNED_IN_PATH)
    expect(safeSignedInPath("/auth/callback")).toBe(DEFAULT_SIGNED_IN_PATH)
    expect(safeSignedInPath("/")).toBe(DEFAULT_SIGNED_IN_PATH)
    expect(safeSignedInPath("//example.com/home")).toBe(
      DEFAULT_SIGNED_IN_PATH
    )
    expect(safeSignedInPath("https://example.com/home")).toBe(
      DEFAULT_SIGNED_IN_PATH
    )
  })

  it("builds callback URLs with only safe signed-in next paths", () => {
    expect(
      buildAuthCallbackUrl("http://localhost:3000", "/home/clients")
    ).toBe("http://localhost:3000/auth/callback?next=%2Fhome%2Fclients")
    expect(buildAuthCallbackUrl("http://localhost:3000", "/login")).toBe(
      "http://localhost:3000/auth/callback"
    )
  })

  it("resolves auth redirects from the central path policy", () => {
    expect(
      resolveAuthRedirect({
        pathname: DEFAULT_SIGNED_IN_PATH,
        hasUser: false,
      })
    ).toBe(LOGIN_PATH)
    expect(resolveAuthRedirect({ pathname: LOGIN_PATH, hasUser: true })).toBe(
      DEFAULT_SIGNED_IN_PATH
    )
    expect(
      resolveAuthRedirect({
        pathname: DEFAULT_SIGNED_IN_PATH,
        hasUser: true,
      })
    ).toBeNull()
  })

  it("forwards root magic-link code redirects to the auth callback route", () => {
    expect(resolveMagicLinkCodeRedirect("/", "?code=abc123")).toBe(
      "/auth/callback?code=abc123"
    )
    expect(resolveMagicLinkCodeRedirect("/login", "?code=abc123")).toBeNull()
  })
})
