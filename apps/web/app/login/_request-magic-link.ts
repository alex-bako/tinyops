import {
  requestMagicLink,
  type RequestMagicLinkDependencies,
} from "@/lib/auth/flow"

import {
  initialLoginState,
  LOGIN_MESSAGES,
  type LoginState,
} from "@/app/login/_state"

export type { RequestMagicLinkDependencies }

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
  const outcome = await requestMagicLink(
    { email: formData.get("email") },
    dependencies
  )

  return loginState(
    outcome.status,
    "email" in outcome ? outcome.email : undefined
  )
}

export { initialLoginState }
