import { safeSignedInPath } from "@/lib/auth/redirect"
import type { AuthenticatedUser } from "@/lib/auth/profile"

export type AuthCallbackDependencies = {
  exchangeCodeForSession: (code: string) => Promise<{
    error: { message: string } | null
  }>
  getUser: () => Promise<{
    user: AuthenticatedUser | null
  }>
  syncProfile: (user: AuthenticatedUser) => Promise<void>
}

export async function handleAuthCallback(
  url: URL,
  dependencies: AuthCallbackDependencies
) {
  const code = url.searchParams.get("code")
  if (!code) return "/login?auth=expired"

  const exchange = await dependencies.exchangeCodeForSession(code)
  if (exchange.error) return "/login?auth=expired"

  const { user } = await dependencies.getUser()
  if (!user) return "/login?auth=expired"

  await dependencies.syncProfile(user)

  return safeSignedInPath(url.searchParams.get("next"))
}
