import {
  syncConnectorRecords,
  type ClientIngestionWriter,
  type ConnectorIngestionPort,
  type ConnectorSourceType,
} from "@/features/clients/ingestion"
import type {
  DataSourceSyncJob,
  DataSourceSyncJobStore,
  DataSourceSyncRunRecorder,
  DataSourceSyncTrigger,
  Result,
  SyncFailure,
} from "@/features/data-sources/domain/sync"
import {
  isSyncFailureCode,
  serializeSyncFailure,
  syncFailure,
  syncFailureMessage,
} from "@/features/data-sources/domain/sync"

export type SourceSyncAdapter = {
  sourceType: ConnectorSourceType
  prepare(input: {
    job: DataSourceSyncJob
  }): Promise<Result<ConnectorIngestionPort, SyncFailure>>
}

type DataSourceSyncWorkerConfig = {
  workerId?: string
  batchSize?: number
  leaseSeconds?: number
  jobStore: DataSourceSyncJobStore
  ingestionWriter: ClientIngestionWriter
  runRecorder: DataSourceSyncRunRecorder
  sourceSyncAdapters: SourceSyncAdapter[]
}

export type DataSourceSyncWorkerResult =
  | { claimed: false }
  | {
      claimed: true
      sourceId: string
      workspaceId: string
      persisted: Awaited<ReturnType<ClientIngestionWriter["persist"]>>
      truncated: boolean
    }
  | {
      claimed: true
      sourceId: string
      workspaceId: string
      failure: SyncFailure
    }

export type DataSourceSyncBatchResult = {
  claimed: number
  succeeded: number
  failed: number
  results: DataSourceSyncWorkerResult[]
}

export function createDataSourceSyncWorker({
  workerId = "data-source-sync-worker",
  batchSize = 50,
  leaseSeconds = 300,
  jobStore,
  ingestionWriter,
  runRecorder,
  sourceSyncAdapters,
}: DataSourceSyncWorkerConfig) {
  return {
    async runNext({
      trigger = "immediate",
    }: {
      trigger?: DataSourceSyncTrigger
    } = {}): Promise<DataSourceSyncWorkerResult> {
      const job = await jobStore.claimNext({ workerId, leaseSeconds })
      if (!job) return { claimed: false }

      let runId: string | null = null
      try {
        await recordSyncRun({
          phase: "start",
          sourceId: job.sourceId,
          workspaceId: job.workspaceId,
          action: async () => {
            const run = await runRecorder.start({
              sourceId: job.sourceId,
              workspaceId: job.workspaceId,
              trigger,
              workerId,
            })
            runId = run.runId
          },
        })

        const adapter = sourceSyncAdapters.find(
          (candidate) => candidate.sourceType === job.sourceType
        )
        if (!adapter) {
          return failClaimedSync({
            jobStore,
            runRecorder,
            job,
            runId,
            failure: syncFailure("sync_failed", job),
          })
        }

        const connectorResult = await adapter.prepare({ job })
        if (!connectorResult.ok) {
          return failClaimedSync({
            jobStore,
            runRecorder,
            job,
            runId,
            failure: withJobContext(connectorResult.error, job),
          })
        }

        const result = await syncConnectorRecords({
          connector: connectorResult.value,
          writer: ingestionWriter,
          input: {
            workspaceId: job.workspaceId,
            sourceId: job.sourceId,
            limit: batchSize,
          },
        })

        await jobStore.complete({
          sourceId: job.sourceId,
          leaseToken: job.leaseToken,
          cursor: result.cursor,
          hasMore: result.truncated,
        })
        await recordSyncRun({
          phase: "succeed",
          sourceId: job.sourceId,
          workspaceId: job.workspaceId,
          action: () =>
            runRecorder.succeed({
              runId,
              sourceId: job.sourceId,
              workspaceId: job.workspaceId,
              persistedCounts: result.persisted,
              cursor: result.cursor,
            }),
        })

        return {
          claimed: true,
          sourceId: job.sourceId,
          workspaceId: job.workspaceId,
          persisted: result.persisted,
          truncated: result.truncated,
        }
      } catch (error) {
        return failClaimedSync({
          jobStore,
          runRecorder,
          job,
          runId,
          failure: syncFailureFromError(error, job),
        })
      }
    },

    async runBatch({
      trigger,
      maxJobs,
    }: {
      trigger: DataSourceSyncTrigger
      maxJobs: number
    }): Promise<DataSourceSyncBatchResult> {
      const limit = Math.max(0, Math.floor(maxJobs))
      const results: DataSourceSyncWorkerResult[] = []

      for (let index = 0; index < limit; index += 1) {
        const result = await this.runNext({ trigger })
        results.push(result)
        if (!result.claimed) break
      }

      return {
        claimed: results.filter((result) => result.claimed).length,
        succeeded: results.filter(
          (result) => result.claimed && !("failure" in result)
        ).length,
        failed: results.filter((result) => result.claimed && "failure" in result)
          .length,
        results,
      }
    },
  }
}

async function failClaimedSync({
  jobStore,
  runRecorder,
  job,
  runId,
  failure,
}: {
  jobStore: DataSourceSyncJobStore
  runRecorder: DataSourceSyncRunRecorder
  job: DataSourceSyncJob
  runId: string | null
  failure: SyncFailure
}): Promise<DataSourceSyncWorkerResult> {
  await jobStore.fail({
    sourceId: job.sourceId,
    leaseToken: job.leaseToken,
    error: serializeSyncFailure(failure),
  })
  await recordSyncRun({
    phase: "fail",
    sourceId: job.sourceId,
    workspaceId: job.workspaceId,
    action: () =>
      runRecorder.fail({
        runId,
        sourceId: job.sourceId,
        workspaceId: job.workspaceId,
        failure,
      }),
  })
  return {
    claimed: true,
    sourceId: job.sourceId,
    workspaceId: job.workspaceId,
    failure,
  }
}

async function recordSyncRun({
  phase,
  sourceId,
  workspaceId,
  action,
}: {
  phase: "start" | "succeed" | "fail"
  sourceId: string
  workspaceId: string
  action: () => Promise<void>
}) {
  try {
    await action()
  } catch (error) {
    console.warn("data_source_sync_run_record_failed", {
      phase,
      sourceId,
      workspaceId,
      message: safeRecordErrorMessage(error),
    })
  }
}

function safeRecordErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  if (/password|token|api[_ -]?key|decrypted_secret/i.test(message)) {
    return "Run record failed"
  }
  return message.slice(0, 500)
}

function syncFailureFromError(
  error: unknown,
  job: DataSourceSyncJob
): SyncFailure {
  const code =
    error instanceof Error && isSyncFailureCode(error.message)
      ? error.message
      : "sync_failed"
  const cause =
    error instanceof Error && error.cause !== undefined ? error.cause : error
  return {
    code,
    message: syncFailureMessage(code),
    sourceId: job.sourceId,
    workspaceId: job.workspaceId,
    cause,
  }
}

function withJobContext(
  failure: SyncFailure,
  job: DataSourceSyncJob
): SyncFailure {
  return {
    ...failure,
    sourceId: failure.sourceId ?? job.sourceId,
    workspaceId: failure.workspaceId ?? job.workspaceId,
  }
}

export type {
  DataSourceSyncJob,
  DataSourceSyncJobStore,
  DataSourceSyncRunRecorder,
  DataSourceSyncTrigger,
  SyncFailure,
}
