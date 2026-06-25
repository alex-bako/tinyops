import type { DataSourceSyncScheduler } from "@/features/data-sources/domain/sync"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type RpcResult = {
  data: unknown
  error: { message: string } | null
}

export type SupabaseSyncSchedulerClient = {
  rpc(fn: string): PromiseLike<RpcResult>
}

export function createSupabaseDataSourceSyncScheduler({
  client,
}: {
  client: SupabaseSyncSchedulerClient
}): DataSourceSyncScheduler {
  return {
    async enqueueDueSyncs() {
      const { data, error } = await client.rpc("enqueue_due_data_source_syncs")
      if (error) {
        throw new Error("Could not enqueue due data source syncs", {
          cause: error,
        })
      }
      return { queued: typeof data === "number" ? data : 0 }
    },
  }
}

export function createDataSourceSyncScheduler(): DataSourceSyncScheduler {
  const client =
    createSupabaseAdminClient() as unknown as SupabaseSyncSchedulerClient
  return createSupabaseDataSourceSyncScheduler({ client })
}
