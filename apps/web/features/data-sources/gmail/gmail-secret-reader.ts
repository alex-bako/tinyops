import type {
  Result,
  SyncFailure,
  SyncFailureCode,
} from "@/features/data-sources/application"
import {
  isSyncFailureCode,
  syncFailureMessage,
} from "@/features/data-sources/application"
import { isGmailAuthError } from "@/features/data-sources/gmail/gmail-api-client"
import {
  refreshGmailAccessToken,
  type GmailTokenResult,
} from "@/features/data-sources/gmail/gmail-oauth"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { getGmailOAuthConfig } from "@/lib/supabase/server-env"

type RpcError = { message: string; code?: string; details?: string; hint?: string }
type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>

export type SupabaseGmailSecretReaderClient = {
  rpc(fn: string, args: unknown): RpcResult<unknown>
}

type ReadInput = { workspaceId: string; sourceId: string }

export type GmailCredentialReader = {
  /**
   * Reads the stored refresh token (service-role RPC) and exchanges it for a
   * short-lived access token. The access token is never persisted. A rotated
   * refresh token, if Google returns one, is written back best-effort.
   */
  readAccessTokenForSync(input: ReadInput): Promise<Result<string, SyncFailure>>
}

export function createSupabaseGmailCredentialReader({
  client,
  refreshAccessToken,
}: {
  client?: SupabaseGmailSecretReaderClient
  refreshAccessToken?: (refreshToken: string) => Promise<GmailTokenResult>
} = {}): GmailCredentialReader {
  async function readAccessTokenForSync(
    input: ReadInput
  ): Promise<Result<string, SyncFailure>> {
    const secretClient =
      client ??
      (createSupabaseAdminClient() as unknown as SupabaseGmailSecretReaderClient)

    const { data, error, rejectedCause } = await readRefreshTokenRpc(
      secretClient,
      input
    )
    if (error) {
      return { ok: false, error: mapRpcError(error, input, rejectedCause) }
    }
    if (typeof data !== "string" || !data.trim()) {
      return { ok: false, error: syncFailure("secret_read_failed", input) }
    }

    const exchange = refreshAccessToken ?? defaultRefreshAccessToken
    let token: GmailTokenResult
    try {
      token = await exchange(data)
    } catch (cause) {
      const code: SyncFailureCode = isGmailAuthError(cause)
        ? "gmail_auth_revoked"
        : "gmail_api_error"
      return { ok: false, error: syncFailure(code, input, cause) }
    }

    if (token.refreshToken && token.refreshToken !== data) {
      await rotateRefreshToken(secretClient, input, token.refreshToken)
    }

    if (!token.accessToken) {
      return { ok: false, error: syncFailure("gmail_api_error", input) }
    }
    return { ok: true, value: token.accessToken }
  }

  return { readAccessTokenForSync }
}

function defaultRefreshAccessToken(refreshToken: string) {
  const config = getGmailOAuthConfig()
  return refreshGmailAccessToken({
    clientId: config.clientId,
    clientSecret: config.clientSecret,
    refreshToken,
  })
}

async function readRefreshTokenRpc(
  secretClient: SupabaseGmailSecretReaderClient,
  input: ReadInput
): Promise<{ data: unknown; error: RpcError | null; rejectedCause?: unknown }> {
  try {
    return await secretClient.rpc("read_gmail_data_source_refresh_token", {
      target_workspace_id: input.workspaceId,
      target_source_id: input.sourceId,
    })
  } catch (error) {
    return { data: null, error: { message: "secret_read_failed" }, rejectedCause: error }
  }
}

async function rotateRefreshToken(
  secretClient: SupabaseGmailSecretReaderClient,
  input: ReadInput,
  newRefreshToken: string
): Promise<void> {
  try {
    await secretClient.rpc("rotate_gmail_data_source_refresh_token", {
      target_workspace_id: input.workspaceId,
      target_source_id: input.sourceId,
      new_refresh_token: newRefreshToken,
    })
  } catch {
    // Token rotation is best-effort; the existing token still works this run.
  }
}

function mapRpcError(
  error: RpcError,
  input: ReadInput,
  rejectedCause?: unknown
): SyncFailure {
  const code: SyncFailureCode = isSyncFailureCode(error.message)
    ? error.message
    : "secret_read_failed"
  return syncFailure(code, input, rejectedCause ?? error)
}

function syncFailure(
  code: SyncFailureCode,
  input: ReadInput,
  cause?: unknown
): SyncFailure {
  return {
    code,
    message: syncFailureMessage(code),
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
    ...(cause === undefined ? {} : { cause }),
  }
}
