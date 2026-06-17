/**
 * Pure Google OAuth 2.0 helpers for the Gmail connector. No googleapis SDK and
 * no global singletons: the fetch implementation is injectable so the consent
 * URL builder and token exchanges are trivially unit-testable.
 */

export const GMAIL_READONLY_SCOPE =
  "https://www.googleapis.com/auth/gmail.readonly"

/** httpOnly cookie carrying the CSRF state nonce across the OAuth round-trip. */
export const GMAIL_OAUTH_STATE_COOKIE = "tinyops_gmail_oauth_state"

const GOOGLE_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"

export type GmailOAuthConfig = {
  clientId: string
  clientSecret: string
  redirectUri: string
}

export type GmailTokenResult = {
  accessToken: string
  refreshToken: string | null
  expiresInSeconds: number | null
}

export type FetchLike = (
  input: string,
  init: { method: string; headers: Record<string, string>; body: string }
) => Promise<{ ok: boolean; status: number; json(): Promise<unknown> }>

export class GmailOAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "GmailOAuthError"
  }
}

export function buildGmailConsentUrl({
  clientId,
  redirectUri,
  state,
  loginHint,
}: {
  clientId: string
  redirectUri: string
  state: string
  loginHint?: string
}): string {
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GMAIL_READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  })
  if (loginHint) params.set("login_hint", loginHint)
  return `${GOOGLE_AUTH_ENDPOINT}?${params.toString()}`
}

export async function exchangeGmailCode(
  config: GmailOAuthConfig,
  code: string,
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike
): Promise<GmailTokenResult> {
  const result = await postToken(
    {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      redirect_uri: config.redirectUri,
      grant_type: "authorization_code",
      code,
    },
    fetchImpl
  )
  if (!result.refreshToken) {
    // We always request access_type=offline + prompt=consent, so a missing
    // refresh token means the grant cannot be persisted for background sync.
    throw new GmailOAuthError("missing_refresh_token")
  }
  return result
}

export async function refreshGmailAccessToken(
  config: { clientId: string; clientSecret: string; refreshToken: string },
  fetchImpl: FetchLike = globalThis.fetch as unknown as FetchLike
): Promise<GmailTokenResult> {
  return postToken(
    {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: config.refreshToken,
    },
    fetchImpl
  )
}

async function postToken(
  form: Record<string, string>,
  fetchImpl: FetchLike
): Promise<GmailTokenResult> {
  const response = await fetchImpl(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form).toString(),
  })

  const payload = (await response.json().catch(() => null)) as {
    access_token?: string
    refresh_token?: string
    expires_in?: number
    error?: string
    error_description?: string
  } | null

  if (!response.ok || !payload || !payload.access_token) {
    // Surface Google's `error` (e.g. invalid_grant) so callers can classify it.
    throw new GmailOAuthError(payload?.error ?? `token_request_failed_${response.status}`)
  }

  return {
    accessToken: payload.access_token,
    refreshToken: payload.refresh_token ?? null,
    expiresInSeconds: payload.expires_in ?? null,
  }
}
