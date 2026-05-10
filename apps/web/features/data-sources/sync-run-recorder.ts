import type {
  DataSourceSyncRunRecorder,
  DataSourceSyncTrigger,
} from "@/features/data-sources/domain/sync"
import {
  safeSyncFailureCauseMessage,
  type SyncFailure,
} from "@/features/data-sources/domain/sync"
import type { Json } from "@/lib/database.types"

type RpcError = { message: string } | null

export type SupabaseSyncRunRecorderClient = {
  from(table: "data_source_sync_runs"): {
    insert(payload: Record<string, unknown>): {
      select(columns: string): {
        single(): PromiseLike<{
          data: { id?: unknown } | null
          error: RpcError
        }>
      }
    }
    update(payload: Record<string, unknown>): {
      eq(
        column: "id",
        value: string
      ): PromiseLike<{
        data: unknown
        error: RpcError
      }>
    }
  }
}

export function createSupabaseDataSourceSyncRunRecorder({
  client,
}: {
  client: SupabaseSyncRunRecorderClient
}): DataSourceSyncRunRecorder {
  return {
    async start(input) {
      const { data, error } = await client
        .from("data_source_sync_runs")
        .insert(startPayload(input))
        .select("id")
        .single()

      if (error) throw new Error("Could not record sync run start", { cause: error })
      return { runId: typeof data?.id === "string" ? data.id : null }
    },

    async succeed(input) {
      if (!input.runId) return
      const { error } = await client
        .from("data_source_sync_runs")
        .update({
          status: "succeeded",
          finished_at: new Date().toISOString(),
          persisted_counts: input.persistedCounts as unknown as Json,
          cursor: (input.cursor ?? null) as Json | null,
          diagnostics: (input.diagnostics ?? null) as Json | null,
        })
        .eq("id", input.runId)

      if (error) throw new Error("Could not record sync run success", { cause: error })
    },

    async fail(input) {
      if (!input.runId) return
      const causeMessage = safeSyncFailureCauseMessage(input.failure.cause)
      const { error } = await client
        .from("data_source_sync_runs")
        .update({
          status: "failed",
          finished_at: new Date().toISOString(),
          error_code: input.failure.code,
          error_message: input.failure.message,
          ...(causeMessage ? { cause_message: causeMessage } : {}),
        })
        .eq("id", input.runId)

      if (error) throw new Error("Could not record sync run failure", { cause: error })
    },
  }
}

function startPayload(input: {
  sourceId: string
  workspaceId: string
  trigger: DataSourceSyncTrigger
  workerId: string
}) {
  return {
    source_id: input.sourceId,
    workspace_id: input.workspaceId,
    trigger: input.trigger,
    status: "running",
    worker_id: input.workerId,
  }
}

export type { SyncFailure }
