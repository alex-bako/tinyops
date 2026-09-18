import { normalizeEmail } from "@/lib/auth/email"
import {
  buildAuthCallbackUrl,
  safeSignedInPath,
} from "@/lib/auth/route-policy"
import type { AuthenticatedUser } from "@/lib/auth/profile"

type SendMagicLinkResult = {
  error: { message: string } | null
}

export type RequestMagicLinkDependencies = {
  getOrigin: () => string
  isInvited: (email: string) => Promise<boolean>
  sendMagicLink: (input: {
    email: string
    emailRedirectTo: string
  }) => Promise<SendMagicLinkResult>
}

export type RequestMagicLinkOutcome =
  | { status: "invalid" }
  | { status: "uninvited"; email: string }
  | { status: "sent"; email: string }
  | { status: "error"; email: string }

export async function requestMagicLink(
  input: { email: FormDataEntryValue | null },
  dependencies: RequestMagicLinkDependencies
): Promise<RequestMagicLinkOutcome> {
  const email = normalizeEmail(input.email)
  if (!email) return { status: "invalid" }

  let invited: boolean
  try {
    invited = await dependencies.isInvited(email)
  } catch {
    return { status: "error", email }
  }

  if (!invited) return { status: "uninvited", email }

  const result = await dependencies.sendMagicLink({
    email,
    emailRedirectTo: buildAuthCallbackUrl(dependencies.getOrigin()),
  })

  if (result.error) return { status: "error", email }

  return { status: "sent", email }
}

export type AuthCallbackTokenType = "invite" | "magiclink"

export type CompleteAuthCallbackDependencies = {
  exchangeCodeForSession: (code: string) => Promise<{
    error: { message: string } | null
  }>
  // Links from `generateLink`/email templates carry a token hash instead of a
  // PKCE code because the invitee's browser never started the flow.
  verifyOtp: (input: {
    token_hash: string
    type: AuthCallbackTokenType
  }) => Promise<{ error: { message: string } | null }>
  getUser: () => Promise<{
    user: AuthenticatedUser | null
  }>
  syncProfile: (user: AuthenticatedUser) => Promise<void>
}

export async function completeAuthCallback(
  url: URL,
  dependencies: CompleteAuthCallbackDependencies
) {
  const verified = await verifyCallback(url, dependencies)
  if (!verified) return "/login?auth=expired"

  const { user } = await dependencies.getUser()
  if (!user) return "/login?auth=expired"

  await dependencies.syncProfile(user)

  return safeSignedInPath(url.searchParams.get("next"))
}

async function verifyCallback(
  url: URL,
  dependencies: CompleteAuthCallbackDependencies
) {
  const code = url.searchParams.get("code")
  if (code) {
    return !(await dependencies.exchangeCodeForSession(code)).error
  }
  const tokenHash = url.searchParams.get("token_hash")
  const type = url.searchParams.get("type")
  if (tokenHash && (type === "invite" || type === "magiclink")) {
    return !(await dependencies.verifyOtp({ token_hash: tokenHash, type }))
      .error
  }
  return false
}
