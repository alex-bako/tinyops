import { describe, expect, it } from "vitest"

import { createSupabaseDataSourceSyncScheduler } from "@/features/data-sources/adapters/sync-scheduler"

describe("supabase data source sync scheduler", () => {
  it("enqueues due syncs via the rpc and maps the queued count", async () => {
    const calls: string[] = []
    const scheduler = createSupabaseDataSourceSyncScheduler({
      client: {
        rpc: async (fn) => {
          calls.push(fn)
          return { data: 3, error: null }
        },
      },
    })

    await expect(scheduler.enqueueDueSyncs()).resolves.toEqual({ queued: 3 })
    expect(calls).toEqual(["enqueue_due_data_source_syncs"])
  })

  it("defaults to zero when the rpc returns a non-numeric payload", async () => {
    const scheduler = createSupabaseDataSourceSyncScheduler({
      client: {
        rpc: async () => ({ data: null, error: null }),
      },
    })

    await expect(scheduler.enqueueDueSyncs()).resolves.toEqual({ queued: 0 })
  })

  it("throws when the rpc reports an error", async () => {
    const scheduler = createSupabaseDataSourceSyncScheduler({
      client: {
        rpc: async () => ({ data: null, error: { message: "boom" } }),
      },
    })

    await expect(scheduler.enqueueDueSyncs()).rejects.toThrow(
      "Could not enqueue due data source syncs"
    )
  })
})
