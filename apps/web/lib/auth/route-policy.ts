export const LOGIN_PATH = "/login"
export const AUTH_CALLBACK_PATH = "/auth/callback"
export const DEFAULT_SIGNED_IN_PATH = "/home"
export const CLIENTS_PATH = `${DEFAULT_SIGNED_IN_PATH}/clients`
export const SOURCES_PATH = `${DEFAULT_SIGNED_IN_PATH}/sources`

export function isProtectedPath(pathname: string) {
  return (
    pathname === DEFAULT_SIGNED_IN_PATH ||
    pathname.startsWith(`${DEFAULT_SIGNED_IN_PATH}/`)
  )
}

export function isPublicAuthPath(pathname: string) {
  return pathname === LOGIN_PATH || pathname === AUTH_CALLBACK_PATH
}

export function resolveAuthRedirect({
  pathname,
  hasUser,
}: {
  pathname: string
  hasUser: boolean
}) {
  if (!hasUser && isProtectedPath(pathname)) return LOGIN_PATH
  if (hasUser && pathname === LOGIN_PATH) return DEFAULT_SIGNED_IN_PATH
  return null
}

export function safeSignedInPath(value: string | null | undefined) {
  if (!value) return DEFAULT_SIGNED_IN_PATH
  if (!value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_SIGNED_IN_PATH
  }

  const url = new URL(value, "http://tinyops.local")
  if (url.origin !== "http://tinyops.local") {
    return DEFAULT_SIGNED_IN_PATH
  }

  const path = `${url.pathname}${url.search}${url.hash}`
  if (isProtectedPath(url.pathname)) return path

  return DEFAULT_SIGNED_IN_PATH
}

export function buildAuthCallbackUrl(origin: string, nextPath?: string | null) {
  const url = new URL(AUTH_CALLBACK_PATH, origin)
  const safeNext = safeSignedInPath(nextPath)
  if (safeNext !== DEFAULT_SIGNED_IN_PATH) {
    url.searchParams.set("next", safeNext)
  }
  return url.toString()
}

export function resolveMagicLinkCodeRedirect(pathname: string, search: string) {
  if (pathname !== "/") return null

  const params = new URLSearchParams(search)
  if (!params.has("code")) return null

  return `${AUTH_CALLBACK_PATH}?${params.toString()}`
}
