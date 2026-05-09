export const DEFAULT_SIGNED_IN_PATH = "/home"

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
  if (path === "/home" || path.startsWith("/home/")) {
    return path
  }

  return DEFAULT_SIGNED_IN_PATH
}

export function buildAuthCallbackUrl(origin: string, nextPath?: string | null) {
  const url = new URL("/auth/callback", origin)
  const safeNext = safeSignedInPath(nextPath)
  if (safeNext !== DEFAULT_SIGNED_IN_PATH) {
    url.searchParams.set("next", safeNext)
  }
  return url.toString()
}
