import { describe, expect, it, vi } from "vitest"

import {
  createDataSourceSyncWorker,
  type SourceSyncAdapter,
} from "@/features/data-sources/sync-worker"
import type { NormalizedConnectorRecord } from "@/features/clients/ingestion"

const normalizedRecord: NormalizedConnectorRecord = {
  workspaceId: "workspace_1",
  sourceId: "source_1",
  sourceType: "imap",
  externalId: "message:<m1@example.com>",
  recordType: "email",
  eventType: "email_received",
  occurredAt: "2026-05-07T08:00:00.000Z",
  title: "Replay access",
  summary: "Asked about replay access.",
  bodyText: "Could you resend the replay link?",
  participants: [{ email: "anna@example.com", role: "external" }],
  metadata: {},
  attributes: [],
  sensitivityLevel: 0,
}

function noopRunRecorder() {
  return {
    async start() {
      return { runId: "run_1" }
    },
    async succeed() {},
    async fail() {},
  }
}

describe("data source sync worker", () => {
  it("claims a job, prepares the matching source adapter, persists records, and completes the lease", async () => {
    const calls: unknown[] = []
    const runEvents: unknown[] = []
    const adapter: SourceSyncAdapter = {
      sourceType: "imap",
      async prepare(input) {
        calls.push({ method: "prepare", input })
        return {
          ok: true,
          value: {
            async preview() {
              throw new Error("worker should not preview")
            },
            async sync(input) {
              calls.push({ method: "sync", input })
              return {
                records: [normalizedRecord],
                truncated: false,
                cursor: { folders: { INBOX: { lastUid: 11 } } },
              }
            },
          },
        }
      },
    }
    const worker = createDataSourceSyncWorker({
      workerId: "worker_1",
      batchSize: 25,
      jobStore: {
        async claimNext() {
          calls.push({ method: "claimNext" })
          return {
            sourceId: "source_1",
            workspaceId: "workspace_1",
            sourceType: "imap",
            leaseToken: "lease_1",
          }
        },
        async complete(input) {
          calls.push({ method: "complete", input })
        },
        async fail(input) {
          calls.push({ method: "fail", input })
        },
      },
      ingestionWriter: {
        async persist(records) {
          calls.push({ method: "persist", records })
          return { clients: 1, rawRecords: 1, timelineEvents: 1 }
        },
      },
      runRecorder: {
        async start(input) {
          runEvents.push({ method: "start", input })
          return { runId: "run_1" }
        },
        async succeed(input) {
          runEvents.push({ method: "succeed", input })
        },
        async fail(input) {
          runEvents.push({ method: "fail", input })
        },
      },
      sourceSyncAdapters: [adapter],
    })

    await expect(worker.runNext({ trigger: "immediate" })).resolves.toMatchObject({
      claimed: true,
      sourceId: "source_1",
      persisted: { clients: 1, rawRecords: 1, timelineEvents: 1 },
    })
    expect(calls).toContainEqual({
      method: "prepare",
      input: {
        job: {
          sourceId: "source_1",
          workspaceId: "workspace_1",
          sourceType: "imap",
          leaseToken: "lease_1",
        },
      },
    })
    expect(calls).toContainEqual({
      method: "sync",
      input: { workspaceId: "workspace_1", sourceId: "source_1", limit: 25 },
    })
    expect(calls).toContainEqual({
      method: "complete",
      input: {
        sourceId: "source_1",
        leaseToken: "lease_1",
        cursor: { folders: { INBOX: { lastUid: 11 } } },
        hasMore: false,
      },
    })
    expect(runEvents).toEqual([
      {
        method: "start",
        input: {
          sourceId: "source_1",
          workspaceId: "workspace_1",
          trigger: "immediate",
          workerId: "worker_1",
        },
      },
      {
        method: "succeed",
        input: {
          runId: "run_1",
          sourceId: "source_1",
          workspaceId: "workspace_1",
          persistedCounts: { clients: 1, rawRecords: 1, timelineEvents: 1 },
          cursor: { folders: { INBOX: { lastUid: 11 } } },
        },
      },
    ])
  })

  it("fails a claimed job when no adapter supports its source type", async () => {
    const calls: unknown[] = []
    const worker = createDataSourceSyncWorker({
      workerId: "worker_1",
      jobStore: {
        async claimNext() {
          return {
            sourceId: "source_1",
            workspaceId: "workspace_1",
            sourceType: "stripe",
            leaseToken: "lease_1",
          }
        },
        async complete(input) {
          calls.push({ method: "complete", input })
        },
        async fail(input) {
          calls.push({ method: "fail", input })
        },
      },
      ingestionWriter: {
        async persist() {
          throw new Error("unsupported source means no persist")
        },
      },
      runRecorder: noopRunRecorder(),
      sourceSyncAdapters: [],
    })

    await expect(worker.runNext({ trigger: "immediate" })).resolves.toMatchObject({
      claimed: true,
      sourceId: "source_1",
      workspaceId: "workspace_1",
      failure: {
        code: "sync_failed",
        message: "Sync failed",
        sourceId: "source_1",
        workspaceId: "workspace_1",
      },
    })
    expect(calls).toContainEqual({
      method: "fail",
      input: {
        sourceId: "source_1",
        leaseToken: "lease_1",
        error: "sync_failed: Sync failed",
      },
    })
    expect(calls).not.toContainEqual(expect.objectContaining({ method: "complete" }))
  })

  it("records source adapter preparation failures without persisting records", async () => {
    const calls: unknown[] = []
    const worker = createDataSourceSyncWorker({
      workerId: "worker_1",
      jobStore: {
        async claimNext() {
          return {
            sourceId: "source_1",
            workspaceId: "workspace_1",
            sourceType: "imap",
            leaseToken: "lease_1",
          }
        },
        async complete(input) {
          calls.push({ method: "complete", input })
        },
        async fail(input) {
          calls.push({ method: "fail", input })
        },
      },
      ingestionWriter: {
        async persist() {
          throw new Error("prepare failure means no persist")
        },
      },
      sourceSyncAdapters: [
        {
          sourceType: "imap",
          async prepare({ job }) {
            return {
              ok: false,
              error: {
                code: "secret_read_failed",
                message: "Could not read IMAP password",
                sourceId: job.sourceId,
                workspaceId: job.workspaceId,
              },
            }
          },
        },
      ],
      runRecorder: {
        async start() {
          return { runId: "run_1" }
        },
        async succeed(input) {
          calls.push({ method: "succeed", input })
        },
        async fail(input) {
          calls.push({ method: "recordFail", input })
        },
      },
    })

    await expect(worker.runNext({ trigger: "immediate" })).resolves.toMatchObject({
      claimed: true,
      sourceId: "source_1",
      workspaceId: "workspace_1",
      failure: {
        code: "secret_read_failed",
        message: "Could not read IMAP password",
      },
    })
    expect(calls).toContainEqual({
      method: "fail",
      input: {
        sourceId: "source_1",
        leaseToken: "lease_1",
        error: "secret_read_failed: Could not read IMAP password",
      },
    })
    expect(calls).toContainEqual({
      method: "recordFail",
      input: {
        runId: "run_1",
        sourceId: "source_1",
        workspaceId: "workspace_1",
        failure: expect.objectContaining({
          code: "secret_read_failed",
          message: "Could not read IMAP password",
        }),
      },
    })
    expect(calls).not.toContainEqual(expect.objectContaining({ method: "complete" }))
    expect(calls).not.toContainEqual(expect.objectContaining({ method: "succeed" }))
  })

  it("does not fail a completed sync when run-history success recording fails", async () => {
    const calls: unknown[] = []
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    const worker = createDataSourceSyncWorker({
      workerId: "worker_1",
      jobStore: {
        async claimNext() {
          return {
            sourceId: "source_1",
            workspaceId: "workspace_1",
            sourceType: "imap",
            leaseToken: "lease_1",
          }
        },
        async complete(input) {
          calls.push({ method: "complete", input })
        },
        async fail(input) {
          calls.push({ method: "fail", input })
        },
      },
      ingestionWriter: {
        async persist() {
          return { clients: 1, rawRecords: 1, timelineEvents: 1 }
        },
      },
      sourceSyncAdapters: [
        {
          sourceType: "imap",
          async prepare() {
            return {
              ok: true,
              value: {
                async preview() {
                  throw new Error("worker should not preview")
                },
                async sync() {
                  return {
                    records: [normalizedRecord],
                    truncated: false,
                    cursor: { folders: { INBOX: { lastUid: 11 } } },
                  }
                },
              },
            }
          },
        },
      ],
      runRecorder: {
        async start() {
          return { runId: "run_1" }
        },
        async succeed() {
          throw new Error("run history unavailable")
        },
        async fail(input) {
          calls.push({ method: "recordFail", input })
        },
      },
    })

    await expect(worker.runNext({ trigger: "immediate" })).resolves.toMatchObject({
      claimed: true,
      sourceId: "source_1",
      persisted: { clients: 1, rawRecords: 1, timelineEvents: 1 },
    })
    expect(calls).toContainEqual({
      method: "complete",
      input: {
        sourceId: "source_1",
        leaseToken: "lease_1",
        cursor: { folders: { INBOX: { lastUid: 11 } } },
        hasMore: false,
      },
    })
    expect(calls).not.toContainEqual(expect.objectContaining({ method: "fail" }))
    expect(calls).not.toContainEqual(
      expect.objectContaining({ method: "recordFail" })
    )
    expect(consoleWarn).toHaveBeenCalledWith(
      "data_source_sync_run_record_failed",
      expect.objectContaining({
        phase: "succeed",
        sourceId: "source_1",
      })
    )
    consoleWarn.mockRestore()
  })

  it("runs batches up to the requested cap and stops when the queue is idle", async () => {
    let claims = 0
    const worker = createDataSourceSyncWorker({
      workerId: "worker_1",
      jobStore: {
        async claimNext() {
          claims += 1
          if (claims > 2) return null
          return {
            sourceId: `source_${claims}`,
            workspaceId: "workspace_1",
            sourceType: "imap",
            leaseToken: `lease_${claims}`,
          }
        },
        async complete() {},
        async fail() {},
      },
      ingestionWriter: {
        async persist() {
          return { clients: 0, rawRecords: 0, timelineEvents: 0 }
        },
      },
      sourceSyncAdapters: [
        {
          sourceType: "imap",
          async prepare() {
            return {
              ok: true,
              value: {
                async preview() {
                  throw new Error("worker should not preview")
                },
                async sync() {
                  return { records: [], truncated: false, cursor: null }
                },
              },
            }
          },
        },
      ],
      runRecorder: noopRunRecorder(),
    })

    await expect(
      worker.runBatch({ trigger: "cron", maxJobs: 5 })
    ).resolves.toMatchObject({
      claimed: 2,
      succeeded: 2,
      failed: 0,
    })
    expect(claims).toBe(3)
  })
})
