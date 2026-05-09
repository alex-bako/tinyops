import { buildAuthCallbackUrl } from "@/lib/auth/redirect"
import { normalizeEmail } from "@/lib/auth/email"

import {
  initialLoginState,
  LOGIN_MESSAGES,
  type LoginState,
} from "@/app/login/_state"

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

function loginState(status: LoginState["status"], submittedEmail?: string) {
  return {
    status,
    message: LOGIN_MESSAGES[status],
    submittedEmail,
  } satisfies LoginState
}

export async function requestMagicLinkWithDependencies(
  _previousState: LoginState,
  formData: FormData,
  dependencies: RequestMagicLinkDependencies
): Promise<LoginState> {
  const email = normalizeEmail(formData.get("email"))
  if (!email) return loginState("invalid")

  let invited: boolean
  try {
    invited = await dependencies.isInvited(email)
  } catch {
    return loginState("error", email)
  }

  if (!invited) return loginState("uninvited", email)

  const result = await dependencies.sendMagicLink({
    email,
    emailRedirectTo: buildAuthCallbackUrl(dependencies.getOrigin()),
  })

  if (result.error) return loginState("error", email)

  return loginState("sent", email)
}

export { initialLoginState }
