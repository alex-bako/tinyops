import type { ConnectorIngestionPort } from "@/features/clients/application/connector-ingestion"
import {
  createGoogleFormsManualCsvConnector,
  type GoogleFormsManualCsvRowReader,
} from "@/features/data-sources/google-forms-sync"
import type { SourceSyncAdapter } from "@/features/data-sources/sync-worker"
import type {
  DataSourceReader,
  GoogleFormsDataSource,
  WorkspaceDataSource,
} from "@/features/data-sources/types"
import type { DataSourceSyncJob } from "@/features/data-sources/domain/sync"
import { syncFailure } from "@/features/data-sources/domain/sync"

type ConnectorFactoryInput = {
  source: GoogleFormsDataSource
  rowReader: GoogleFormsManualCsvRowReader
}

export function createGoogleFormsSourceSyncAdapter({
  dataSourceReader,
  rowReader,
  connectorFactory = createGoogleFormsManualCsvConnector,
}: {
  dataSourceReader: DataSourceReader
  rowReader: GoogleFormsManualCsvRowReader
  connectorFactory?: (input: ConnectorFactoryInput) => ConnectorIngestionPort
}): SourceSyncAdapter {
  return {
    sourceType: "forms",
    async prepare({ job }) {
      const source = await loadClaimedGoogleFormsSource({ dataSourceReader, job })
      if (!source) {
        return {
          ok: false,
          error: syncFailure("source_not_found", job),
        }
      }

      if (source.connectionMode !== "manual_csv") {
        return {
          ok: false,
          error: syncFailure("sync_failed", job),
        }
      }

      return {
        ok: true,
        value: connectorFactory({ source, rowReader }),
      }
    },
  }
}

async function loadClaimedGoogleFormsSource({
  dataSourceReader,
  job,
}: {
  dataSourceReader: DataSourceReader
  job: DataSourceSyncJob
}): Promise<GoogleFormsDataSource | null> {
  const source = await dataSourceReader.findByIdForWorkspace({
    workspaceId: job.workspaceId,
    sourceId: job.sourceId,
  })
  return source && isGoogleFormsSource(source) ? source : null
}

function isGoogleFormsSource(
  source: WorkspaceDataSource
): source is GoogleFormsDataSource {
  return source.type === "forms"
}
