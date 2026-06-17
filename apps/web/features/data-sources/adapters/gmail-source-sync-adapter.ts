import type { ConnectorIngestionPort } from "@/features/clients/application/connector-ingestion"
import type {
  DataSourceSyncJob,
  SyncFailure,
} from "@/features/data-sources/domain/sync"
import { syncFailure } from "@/features/data-sources/domain/sync"
import type { GmailCredentialReader } from "@/features/data-sources/gmail/gmail-secret-reader"
import { createGmailConnector } from "@/features/data-sources/gmail/gmail-sync"
import type { SourceSyncAdapter } from "@/features/data-sources/sync-worker"
import type {
  DataSourceQueryPort,
  GmailDataSource,
  WorkspaceDataSource,
} from "@/features/data-sources/types"
import { createNoopLogger, type LoggerPort } from "@/lib/logging"

type ConnectorFactoryInput = {
  source: GmailDataSource
  accessToken: string
  manualReviewKeywords: string[]
}

export function createGmailSourceSyncAdapter({
  dataSourceReader,
  gmailCredentialReader,
  connectorFactory,
  manualReviewKeywordsForWorkspace = async () => [],
  logger = createNoopLogger(),
}: {
  dataSourceReader: DataSourceQueryPort
  gmailCredentialReader: GmailCredentialReader
  connectorFactory?: (input: ConnectorFactoryInput) => ConnectorIngestionPort
  manualReviewKeywordsForWorkspace?: (workspaceId: string) => Promise<string[]>
  logger?: LoggerPort
}): SourceSyncAdapter {
  const createConnector =
    connectorFactory ??
    (({ source, accessToken, manualReviewKeywords }: ConnectorFactoryInput) =>
      createGmailConnector({
        source,
        accessToken,
        ownerEmails: [],
        manualReviewKeywords,
      }))

  return {
    sourceType: "gmail",
    async prepare({ job }) {
      const prepareLogger = logger.child({
        component: "gmail_source_sync_adapter",
        sourceId: job.sourceId,
        workspaceId: job.workspaceId,
      })
      prepareLogger.debug(
        { event: "gmail.adapter.prepare" },
        "preparing Gmail adapter"
      )

      const source = await loadClaimedGmailSource({ dataSourceReader, job })
      if (!source) {
        return { ok: false, error: syncFailure("source_not_found", job) }
      }

      const tokenResult = await gmailCredentialReader.readAccessTokenForSync({
        workspaceId: job.workspaceId,
        sourceId: job.sourceId,
      })
      if (!tokenResult.ok) {
        return { ok: false, error: withJobContext(tokenResult.error, job) }
      }

      const manualReviewKeywords = await manualReviewKeywordsForWorkspace(
        job.workspaceId
      )

      return {
        ok: true,
        value: createConnector({
          source,
          accessToken: tokenResult.value,
          manualReviewKeywords,
        }),
      }
    },
  }
}

async function loadClaimedGmailSource({
  dataSourceReader,
  job,
}: {
  dataSourceReader: DataSourceQueryPort
  job: DataSourceSyncJob
}): Promise<GmailDataSource | null> {
  const source = await dataSourceReader.findByIdForWorkspace({
    workspaceId: job.workspaceId,
    sourceId: job.sourceId,
  })
  return source && isGmailSource(source) ? source : null
}

function isGmailSource(source: WorkspaceDataSource): source is GmailDataSource {
  return source.type === "gmail"
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
