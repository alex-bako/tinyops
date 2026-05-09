export type LoginStatus = "idle" | "invalid" | "uninvited" | "sent" | "error"

export type LoginState = {
  status: LoginStatus
  message: string
  submittedEmail?: string
}

export const LOGIN_MESSAGES: Record<LoginStatus, string> = {
  idle: "We will send a one-time link to your inbox.",
  invalid: "Enter a valid email address.",
  uninvited:
    "TinyOps is invite-only right now. Use an invited email address or request access.",
  sent: "Check your inbox for a sign-in link.",
  error: "Could not send a sign-in link. Try again in a moment.",
}

export const initialLoginState: LoginState = {
  status: "idle",
  message: LOGIN_MESSAGES.idle,
}
