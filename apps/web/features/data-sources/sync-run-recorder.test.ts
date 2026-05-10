import { describe, expect, it } from "vitest"

import { createSupabaseDataSourceSyncRunRecorder } from "@/features/data-sources/sync-run-recorder"

describe("supabase data source sync run recorder", () => {
  it("persists run start, success, and safe failure details", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return {
          insert(payload: unknown) {
            calls.push({ method: "insert", table, payload })
            return {
              select(columns: string) {
                calls.push({ method: "select", table, columns })
                return {
                  single: async () => ({
                    data: { id: "run_1" },
                    error: null,
                  }),
                }
              },
            }
          },
          update(payload: unknown) {
            calls.push({ method: "update", table, payload })
            return {
              eq(column: string, value: unknown) {
                calls.push({ method: "eq", table, column, value })
                return Promise.resolve({ data: null, error: null })
              },
            }
          },
        }
      },
    }
    const recorder = createSupabaseDataSourceSyncRunRecorder({
      client: client as never,
    })

    await expect(
      recorder.start({
        sourceId: "source_1",
        workspaceId: "workspace_1",
        trigger: "cron",
        workerId: "worker_1",
      })
    ).resolves.toEqual({ runId: "run_1" })
    await recorder.succeed({
      runId: "run_1",
      sourceId: "source_1",
      workspaceId: "workspace_1",
      persistedCounts: { clients: 1, rawRecords: 2, timelineEvents: 3 },
      cursor: { folders: { INBOX: { lastUid: 11 } } },
      diagnostics: {
        folders: [{ path: "INBOX", searched: 3, accepted: 1, skipped: 2 }],
        skips: { filter_rejected: 2 },
        ingestion: { attempted: 1, persisted: { rawRecords: 2 } },
      },
    })
    await recorder.fail({
      runId: "run_1",
      sourceId: "source_1",
      workspaceId: "workspace_1",
      failure: {
        code: "ingestion_failed",
        message: "Could not persist synced records",
        cause: new Error("column reference record_type is ambiguous"),
      },
    })

    expect(calls).toEqual([
      {
        method: "insert",
        table: "data_source_sync_runs",
        payload: {
          source_id: "source_1",
          workspace_id: "workspace_1",
          trigger: "cron",
          status: "running",
          worker_id: "worker_1",
        },
      },
      { method: "select", table: "data_source_sync_runs", columns: "id" },
      {
        method: "update",
        table: "data_source_sync_runs",
        payload: {
          status: "succeeded",
          finished_at: expect.any(String),
          persisted_counts: { clients: 1, rawRecords: 2, timelineEvents: 3 },
          cursor: { folders: { INBOX: { lastUid: 11 } } },
          diagnostics: {
            folders: [{ path: "INBOX", searched: 3, accepted: 1, skipped: 2 }],
            skips: { filter_rejected: 2 },
            ingestion: { attempted: 1, persisted: { rawRecords: 2 } },
          },
        },
      },
      {
        method: "eq",
        table: "data_source_sync_runs",
        column: "id",
        value: "run_1",
      },
      {
        method: "update",
        table: "data_source_sync_runs",
        payload: {
          status: "failed",
          finished_at: expect.any(String),
          error_code: "ingestion_failed",
          error_message: "Could not persist synced records",
          cause_message: "column reference record_type is ambiguous",
        },
      },
      {
        method: "eq",
        table: "data_source_sync_runs",
        column: "id",
        value: "run_1",
      },
    ])
  })
})
