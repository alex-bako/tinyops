import {
  syncConnectorRecords,
  type ClientIngestionWriterPort,
  type ConnectorIngestionPort,
  type ConnectorSourceType,
} from "@/features/clients/application/connector-ingestion"
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
import { createNoopLogger, type LoggerPort } from "@/lib/logging"
import type { Json } from "@/lib/database.types"

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
  ingestionWriter: ClientIngestionWriterPort
  runRecorder: DataSourceSyncRunRecorder
  sourceSyncAdapters: SourceSyncAdapter[]
  logger?: LoggerPort
}

export type DataSourceSyncWorkerResult =
  | { claimed: false }
  | {
      claimed: true
      sourceId: string
      workspaceId: string
      persisted: Awaited<ReturnType<ClientIngestionWriterPort["persist"]>>
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
  logger = createNoopLogger(),
}: DataSourceSyncWorkerConfig) {
  return {
    async runNext({
      trigger = "immediate",
    }: {
      trigger?: DataSourceSyncTrigger
    } = {}): Promise<DataSourceSyncWorkerResult> {
      const startedAt = Date.now()
      const runLogger = logger.child({
        component: "data_source_sync_worker",
        workerId,
        trigger,
      })
      const job = await jobStore.claimNext({ workerId, leaseSeconds })
      if (!job) {
        runLogger.debug({ event: "sync.queue.idle" }, "sync queue idle")
        return { claimed: false }
      }

      const jobLogger = runLogger.child({
        sourceId: job.sourceId,
        workspaceId: job.workspaceId,
        sourceType: job.sourceType,
      })
      jobLogger.info({ event: "sync.job.claimed" }, "sync job claimed")

      let runId: string | null = null
      try {
        await recordSyncRun({
          phase: "start",
          sourceId: job.sourceId,
          workspaceId: job.workspaceId,
          logger: jobLogger,
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
        const syncLogger = runId ? jobLogger.child({ runId }) : jobLogger

        const adapter = sourceSyncAdapters.find(
          (candidate) => candidate.sourceType === job.sourceType
        )
        if (!adapter) {
          return failClaimedSync({
            jobStore,
            runRecorder,
            logger: syncLogger,
            job,
            runId,
            failure: syncFailure("sync_failed", job),
          })
        }

        syncLogger.debug({ event: "sync.adapter.prepare" }, "preparing source adapter")
        const connectorResult = await adapter.prepare({ job })
        if (!connectorResult.ok) {
          return failClaimedSync({
            jobStore,
            runRecorder,
            logger: syncLogger,
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
        const diagnostics = syncDiagnostics({
          connectorDiagnostics: result.diagnostics,
          attemptedRecords: result.records.length,
          persisted: result.persisted,
          hasMore: result.truncated,
          durationMs: Date.now() - startedAt,
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
          logger: syncLogger,
          action: () =>
            runRecorder.succeed({
              runId,
              sourceId: job.sourceId,
              workspaceId: job.workspaceId,
              persistedCounts: result.persisted,
              cursor: result.cursor,
              diagnostics,
            }),
        })
        syncLogger.info(
          {
            event: "sync.job.completed",
            persisted: result.persisted,
            hasMore: result.truncated,
            durationMs: diagnostics.durationMs,
          },
          "sync job completed"
        )

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
          logger: jobLogger,
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
  logger,
  job,
  runId,
  failure,
}: {
  jobStore: DataSourceSyncJobStore
  runRecorder: DataSourceSyncRunRecorder
  logger: LoggerPort
  job: DataSourceSyncJob
  runId: string | null
  failure: SyncFailure
}): Promise<DataSourceSyncWorkerResult> {
  logger.error(
    {
      event: "sync.job.failed",
      code: failure.code,
      message: failure.message,
      causeMessage: safeRecordErrorMessage(failure.cause),
    },
    "sync job failed"
  )
  await jobStore.fail({
    sourceId: job.sourceId,
    leaseToken: job.leaseToken,
    error: serializeSyncFailure(failure),
  })
  await recordSyncRun({
    phase: "fail",
    sourceId: job.sourceId,
    workspaceId: job.workspaceId,
    logger,
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

function syncDiagnostics({
  connectorDiagnostics,
  attemptedRecords,
  persisted,
  hasMore,
  durationMs,
}: {
  connectorDiagnostics?: Json
  attemptedRecords: number
  persisted: Awaited<ReturnType<ClientIngestionWriterPort["persist"]>>
  hasMore: boolean
  durationMs: number
}) {
  const diagnostics = jsonObject(connectorDiagnostics)
  return {
    ...diagnostics,
    ingestion: {
      attempted: attemptedRecords,
      persisted,
    },
    hasMore,
    durationMs,
  } satisfies Record<string, Json | undefined>
}

function jsonObject(value: Json | undefined): Record<string, Json | undefined> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Json | undefined>)
    : {}
}

async function recordSyncRun({
  phase,
  sourceId,
  workspaceId,
  logger,
  action,
}: {
  phase: "start" | "succeed" | "fail"
  sourceId: string
  workspaceId: string
  logger: LoggerPort
  action: () => Promise<void>
}) {
  try {
    await action()
  } catch (error) {
    logger.warn(
      {
        event: "data_source_sync_run_record_failed",
        phase,
        sourceId,
        workspaceId,
        message: safeRecordErrorMessage(error),
      },
      "data source sync run record failed"
    )
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
