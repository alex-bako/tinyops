import { describe, expect, it } from "vitest"

import { createSupabaseDataSourceSyncJobStore } from "@/features/data-sources/sync-job-store"

describe("supabase data source sync job store", () => {
  it("claims the next service-role sync job through the claim RPC", async () => {
    const calls: unknown[] = []
    const store = createSupabaseDataSourceSyncJobStore({
      client: {
        async rpc(fn: string, args: unknown) {
          calls.push({ fn, args })
          return {
            data: [
              {
                source_id: "source_1",
                workspace_id: "workspace_1",
                source_type: "imap",
                lease_token: "lease_1",
              },
            ],
            error: null,
          }
        },
      },
    })

    await expect(
      store.claimNext({ workerId: "worker_1", leaseSeconds: 120 })
    ).resolves.toEqual({
      sourceId: "source_1",
      workspaceId: "workspace_1",
      sourceType: "imap",
      leaseToken: "lease_1",
    })
    expect(calls).toEqual([
      {
        fn: "claim_next_data_source_sync",
        args: { worker_id: "worker_1", lease_seconds: 120 },
      },
    ])
  })

  it("completes and fails claimed sync leases through RPCs", async () => {
    const calls: unknown[] = []
    const store = createSupabaseDataSourceSyncJobStore({
      client: {
        async rpc(fn: string, args: unknown) {
          calls.push({ fn, args })
          return { data: null, error: null }
        },
      },
    })

    await store.complete({
      sourceId: "source_1",
      leaseToken: "lease_1",
      cursor: { folders: { INBOX: { lastUid: 11 } } },
      hasMore: true,
    })
    await store.fail({
      sourceId: "source_2",
      leaseToken: "lease_2",
      error: "imap timeout",
    })

    expect(calls).toEqual([
      {
        fn: "complete_data_source_sync",
        args: {
          target_source_id: "source_1",
          lease_token: "lease_1",
          next_cursor: { folders: { INBOX: { lastUid: 11 } } },
          has_more: true,
        },
      },
      {
        fn: "fail_data_source_sync",
        args: {
          target_source_id: "source_2",
          lease_token: "lease_2",
          sync_error: "imap timeout",
        },
      },
    ])
  })
})
