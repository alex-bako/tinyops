import type {
  Result,
  SyncFailure,
} from "@/features/data-sources/domain/sync"
import {
  isSyncFailureCode,
  syncFailure,
} from "@/features/data-sources/domain/sync"

type RpcError = { message: string }

export type SupabaseMailerLiteSecretReaderClient = {
  rpc(
    fn: string,
    args: unknown
  ): PromiseLike<{ data: unknown; error: RpcError | null }>
}

export type MailerLiteSecretReader = {
  readMailerLiteApiKey(input: {
    workspaceId: string
    sourceId: string
  }): Promise<Result<string, SyncFailure>>
}

export function createSupabaseMailerLiteSecretReader({
  client,
}: {
  client: SupabaseMailerLiteSecretReaderClient
}): MailerLiteSecretReader {
  return {
    async readMailerLiteApiKey(input) {
      let data: unknown
      let error: RpcError | null
      try {
        ;({ data, error } = await client.rpc("read_mailerlite_data_source_api_key", {
          target_workspace_id: input.workspaceId,
          target_source_id: input.sourceId,
        }))
      } catch (cause) {
        return { ok: false, error: syncFailure("secret_read_failed", input, cause) }
      }
      if (error) {
        const code = isSyncFailureCode(error.message)
          ? error.message
          : "secret_read_failed"
        return { ok: false, error: syncFailure(code, input, error) }
      }
      if (typeof data !== "string" || !data.trim()) {
        return { ok: false, error: syncFailure("invalid_mailerlite_config", input) }
      }
      return { ok: true, value: data }
    },
  }
}
