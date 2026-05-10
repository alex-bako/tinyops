import type {
  ImapSecretReader,
  Result,
  SyncFailure,
  SyncFailureCode,
} from "@/features/data-sources/application"
import {
  isSyncFailureCode,
  syncFailureMessage,
} from "@/features/data-sources/application"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type RpcError = {
  message: string
  code?: string
  details?: string
  hint?: string
}

type RpcResult<T> = PromiseLike<{ data: T | null; error: RpcError | null }>
type PasswordRpcResult = {
  data: unknown | null
  error: RpcError | null
  rejectedCause?: unknown
}

export type SupabaseImapSecretReaderClient = {
  rpc(fn: string, args: unknown): RpcResult<unknown>
}

type ReadInput = {
  workspaceId: string
  sourceId: string
}

export function createSupabaseImapSecretReader({
  client,
}: {
  client?: SupabaseImapSecretReaderClient
} = {}): ImapSecretReader {
  async function readImapPasswordForSync(
    input: ReadInput
  ): Promise<Result<string, SyncFailure>> {
    const secretClient =
      client ??
      (createSupabaseAdminClient() as unknown as SupabaseImapSecretReaderClient)
    const { data, error, rejectedCause } = await readPasswordRpc(
      secretClient,
      input
    )

    if (error) {
      return {
        ok: false,
        error: mapRpcError(error, input, rejectedCause),
      }
    }

    if (typeof data !== "string" || !data.trim()) {
      return {
        ok: false,
        error: syncFailure("invalid_imap_config", input),
      }
    }

    return { ok: true, value: data }
  }

  return {
    async readImapPassword(input) {
      const result = await readImapPasswordForSync(input)
      if (result.ok) return result.value
      throw new Error(result.error.code, { cause: result.error.cause })
    },
    readImapPasswordForSync,
  }
}

async function readPasswordRpc(
  secretClient: SupabaseImapSecretReaderClient,
  input: ReadInput
): Promise<PasswordRpcResult> {
  try {
    return await secretClient.rpc("read_imap_data_source_password", {
      target_workspace_id: input.workspaceId,
      target_source_id: input.sourceId,
    })
  } catch (error) {
    return {
      data: null,
      error: { message: "secret_read_failed" },
      rejectedCause: error,
    }
  }
}

function mapRpcError(
  error: RpcError,
  input: ReadInput,
  rejectedCause?: unknown
): SyncFailure {
  const code = isSyncFailureCode(error.message)
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
