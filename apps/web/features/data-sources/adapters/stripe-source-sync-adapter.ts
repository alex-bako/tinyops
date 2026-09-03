import type { ConnectorIngestionPort } from "@/features/clients/application/connector-ingestion"
import { createStripeApiClient } from "@/features/data-sources/stripe-api"
import type { StripeSecretReader } from "@/features/data-sources/stripe-secret-reader"
import { createStripeConnector } from "@/features/data-sources/stripe-sync"
import type { SourceSyncAdapter } from "@/features/data-sources/sync-worker"
import type {
  DataSourceQueryPort,
  StripeApiPort,
  StripeDataSource,
} from "@/features/data-sources/types"
import { syncFailure } from "@/features/data-sources/domain/sync"

export function createStripeSourceSyncAdapter({
  dataSourceReader,
  secretReader,
  apiFactory = (apiKey) => createStripeApiClient({ apiKey }),
  connectorFactory = createStripeConnector,
}: {
  dataSourceReader: DataSourceQueryPort
  secretReader: StripeSecretReader
  apiFactory?: (apiKey: string) => StripeApiPort
  connectorFactory?: (input: {
    source: StripeDataSource
    api: StripeApiPort
  }) => ConnectorIngestionPort
}): SourceSyncAdapter {
  return {
    sourceType: "stripe",
    async prepare({ job }) {
      const source = await dataSourceReader.findByIdForWorkspace({
        workspaceId: job.workspaceId,
        sourceId: job.sourceId,
      })
      if (!source || source.type !== "stripe") {
        return { ok: false, error: syncFailure("source_not_found", job) }
      }
      const apiKey = await secretReader.readStripeApiKey(job)
      if (!apiKey.ok) return apiKey
      return {
        ok: true,
        value: connectorFactory({ source, api: apiFactory(apiKey.value) }),
      }
    },
  }
}
