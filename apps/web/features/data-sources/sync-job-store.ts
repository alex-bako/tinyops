import type { ConnectorSourceType } from "@/features/clients/application/connector-ingestion"
import type { DataSourceSyncJobStore } from "@/features/data-sources/domain/sync"
import type { Json } from "@/lib/database.types"

type RpcResult = {
  data: unknown
  error: { message: string } | null
}

export type SupabaseSyncJobStoreClient = {
  rpc(fn: string, args: unknown): PromiseLike<RpcResult>
}

export function createSupabaseDataSourceSyncJobStore({
  client,
}: {
  client: SupabaseSyncJobStoreClient
}): DataSourceSyncJobStore {
  async function rpc(fn: string, args: unknown) {
    const { data, error } = await client.rpc(fn, args)
    if (error) throw new Error(`Could not run ${fn}`, { cause: error })
    return data
  }

  return {
    async claimNext(input) {
      const data = await rpc("claim_next_data_source_sync", {
        worker_id: input.workerId,
        lease_seconds: input.leaseSeconds,
      })
      const row = firstRow(data)
      const sourceId = stringField(row, "source_id")
      const workspaceId = stringField(row, "workspace_id")
      const sourceType = stringField(row, "source_type") as ConnectorSourceType
      const leaseToken = stringField(row, "lease_token")
      return sourceId && workspaceId && sourceType && leaseToken
        ? { sourceId, workspaceId, sourceType, leaseToken }
        : null
    },

    async complete(input) {
      await rpc("complete_data_source_sync", {
        target_source_id: input.sourceId,
        lease_token: input.leaseToken,
        next_cursor: (input.cursor ?? null) as Json | null,
        has_more: input.hasMore,
      })
    },

    async fail(input) {
      await rpc("fail_data_source_sync", {
        target_source_id: input.sourceId,
        lease_token: input.leaseToken,
        sync_error: input.error,
      })
    },
  }
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return objectRow(data[0])
  return objectRow(data)
}

function objectRow(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function stringField(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key]
  return typeof value === "string" ? value : ""
}
