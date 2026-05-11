import type {
  ConnectorIngestionPort,
} from "@/features/clients/ingestion"
import type { ImapSyncCredentialReader } from "@/features/data-sources/application"
import { createImapConnector } from "@/features/data-sources/imap-sync"
import type { ImapThreadIndexReader } from "@/features/data-sources/imap-threading"
import type { SourceSyncAdapter } from "@/features/data-sources/sync-worker"
import type {
  DataSourceReader,
  ImapDataSource,
  WorkspaceDataSource,
} from "@/features/data-sources/types"
import type {
  DataSourceSyncJob,
  SyncFailure,
} from "@/features/data-sources/domain/sync"
import { syncFailure } from "@/features/data-sources/domain/sync"
import { createNoopLogger, type LoggerPort } from "@/lib/logging"

type ConnectorFactoryInput = {
  source: ImapDataSource
  password: string
  manualReviewKeywords: string[]
}

export function createImapSourceSyncAdapter({
  dataSourceReader,
  imapCredentialReader,
  connectorFactory,
  imapThreadIndexReader,
  manualReviewKeywordsForWorkspace = async () => [],
  logger = createNoopLogger(),
}: {
  dataSourceReader: DataSourceReader
  imapCredentialReader: ImapSyncCredentialReader
  connectorFactory?: (input: ConnectorFactoryInput) => ConnectorIngestionPort
  imapThreadIndexReader?: ImapThreadIndexReader
  manualReviewKeywordsForWorkspace?: (workspaceId: string) => Promise<string[]>
  logger?: LoggerPort
}): SourceSyncAdapter {
  const createConnector =
    connectorFactory ??
    (({ source, password, manualReviewKeywords }: ConnectorFactoryInput) =>
      createImapConnector({
        source,
        password,
        ownerEmails: [source.connection.username],
        manualReviewKeywords,
        threadIndexReader: imapThreadIndexReader,
        logger: logger.child({
          component: "imap_source_sync_adapter",
          sourceId: source.id,
          workspaceId: source.workspaceId,
        }),
      }))

  return {
    sourceType: "imap",
    async prepare({ job }) {
      const prepareLogger = logger.child({
        component: "imap_source_sync_adapter",
        sourceId: job.sourceId,
        workspaceId: job.workspaceId,
      })
      prepareLogger.debug({ event: "imap.adapter.prepare" }, "preparing IMAP adapter")
      const source = await loadClaimedImapSource({ dataSourceReader, job })
      if (!source) {
        return {
          ok: false,
          error: syncFailure("source_not_found", job),
        }
      }

      const passwordResult = await imapCredentialReader.readImapPasswordForSync({
        workspaceId: job.workspaceId,
        sourceId: job.sourceId,
      })
      if (!passwordResult.ok) {
        return {
          ok: false,
          error: withJobContext(passwordResult.error, job),
        }
      }

      const manualReviewKeywords = await manualReviewKeywordsForWorkspace(
        job.workspaceId
      )

      return {
        ok: true,
        value: createConnector({
          source,
          password: passwordResult.value,
          manualReviewKeywords,
        }),
      }
    },
  }
}

async function loadClaimedImapSource({
  dataSourceReader,
  job,
}: {
  dataSourceReader: DataSourceReader
  job: DataSourceSyncJob
}): Promise<ImapDataSource | null> {
  const source = await dataSourceReader.findByIdForWorkspace({
    workspaceId: job.workspaceId,
    sourceId: job.sourceId,
  })
  return source && isImapSource(source) ? source : null
}

function isImapSource(source: WorkspaceDataSource): source is ImapDataSource {
  return source.type === "imap"
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
