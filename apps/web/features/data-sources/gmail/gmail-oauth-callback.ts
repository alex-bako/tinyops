import type { GmailLabel } from "@/features/data-sources/gmail/gmail-api-client"
import { gmailLabelsToAvailableFolders } from "@/features/data-sources/gmail/gmail-connection-probe"

export type GmailConnectRpcArgs = {
  target_workspace_id: string
  gmail_display_name: string
  gmail_email: string
  gmail_refresh_token: string
  gmail_history_window: string
  gmail_watched_labels: string[]
  gmail_skip_senders: string[]
  gmail_message_filters: { mode: "and"; rules: [] }
  gmail_available_labels: ReturnType<typeof gmailLabelsToAvailableFolders>
}

export type GmailCallbackDeps = {
  exchangeCode: (
    code: string
  ) => Promise<{ accessToken: string; refreshToken: string | null }>
  probe: (
    accessToken: string
  ) => Promise<{ emailAddress: string; labels: GmailLabel[] }>
  connect: (args: GmailConnectRpcArgs) => Promise<{ error: { message: string } | null }>
}

export type GmailCallbackFailureReason =
  | "invalid_state"
  | "missing_code"
  | "exchange_failed"
  | "connect_failed"

export type GmailCallbackResult =
  | { ok: true; emailAddress: string }
  | { ok: false; reason: GmailCallbackFailureReason }

/**
 * Orchestrates the OAuth callback after the redirect from Google: verify CSRF
 * state, exchange the code, probe the account, and persist the connection via
 * the connect RPC. Pure of Next.js so it is unit-testable end-to-end.
 */
export async function completeGmailOAuthCallback({
  workspaceId,
  code,
  state,
  expectedState,
  deps,
}: {
  workspaceId: string
  code: string | null
  state: string | null
  expectedState: string | null
  deps: GmailCallbackDeps
}): Promise<GmailCallbackResult> {
  if (!expectedState || !state || state !== expectedState) {
    return { ok: false, reason: "invalid_state" }
  }
  if (!code) {
    return { ok: false, reason: "missing_code" }
  }

  let accessToken: string
  let refreshToken: string | null
  let profile: { emailAddress: string; labels: GmailLabel[] }
  try {
    const tokens = await deps.exchangeCode(code)
    accessToken = tokens.accessToken
    refreshToken = tokens.refreshToken
    if (!refreshToken) return { ok: false, reason: "exchange_failed" }
    profile = await deps.probe(accessToken)
  } catch {
    return { ok: false, reason: "exchange_failed" }
  }

  const { error } = await deps.connect({
    target_workspace_id: workspaceId,
    gmail_display_name: `Gmail (${profile.emailAddress})`,
    gmail_email: profile.emailAddress,
    gmail_refresh_token: refreshToken,
    gmail_history_window: "12mo",
    gmail_watched_labels: ["INBOX", "SENT"],
    gmail_skip_senders: [],
    gmail_message_filters: { mode: "and", rules: [] },
    gmail_available_labels: gmailLabelsToAvailableFolders(profile.labels),
  })
  if (error) {
    return { ok: false, reason: "connect_failed" }
  }

  return { ok: true, emailAddress: profile.emailAddress }
}
