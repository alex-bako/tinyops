import type { ConnectorIngestionPort } from "@/features/clients/application/connector-ingestion"
import { createMailerLiteApiClient } from "@/features/data-sources/mailerlite-api"
import type { MailerLiteSecretReader } from "@/features/data-sources/mailerlite-secret-reader"
import { createMailerLiteConnector } from "@/features/data-sources/mailerlite-sync"
import type { SourceSyncAdapter } from "@/features/data-sources/sync-worker"
import type {
  DataSourceQueryPort,
  MailerLiteApiPort,
  MailerLiteDataSource,
} from "@/features/data-sources/types"
import { syncFailure } from "@/features/data-sources/domain/sync"

export function createMailerLiteSourceSyncAdapter({
  dataSourceReader,
  secretReader,
  apiFactory = (apiKey) => createMailerLiteApiClient({ apiKey }),
  connectorFactory = createMailerLiteConnector,
}: {
  dataSourceReader: DataSourceQueryPort
  secretReader: MailerLiteSecretReader
  apiFactory?: (apiKey: string) => MailerLiteApiPort
  connectorFactory?: (input: {
    source: MailerLiteDataSource
    api: MailerLiteApiPort
  }) => ConnectorIngestionPort
}): SourceSyncAdapter {
  return {
    sourceType: "mailerlite",
    async prepare({ job }) {
      const source = await dataSourceReader.findByIdForWorkspace({
        workspaceId: job.workspaceId,
        sourceId: job.sourceId,
      })
      if (!source || source.type !== "mailerlite") {
        return { ok: false, error: syncFailure("source_not_found", job) }
      }
      const apiKey = await secretReader.readMailerLiteApiKey(job)
      if (!apiKey.ok) return apiKey
      return {
        ok: true,
        value: connectorFactory({ source, api: apiFactory(apiKey.value) }),
      }
    },
  }
}
