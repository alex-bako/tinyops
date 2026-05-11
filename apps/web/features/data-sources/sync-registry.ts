import type { ConnectorSourceType } from "@/features/clients/application/connector-ingestion"
import type { SourceSyncAdapter } from "@/features/data-sources/sync-worker"

export type SourceSyncRegistry = Partial<Record<ConnectorSourceType, SourceSyncAdapter>>

export function createSourceSyncRegistry(
  adapters: SourceSyncAdapter[]
): SourceSyncRegistry {
  return Object.fromEntries(
    adapters.map((adapter) => [adapter.sourceType, adapter])
  ) as SourceSyncRegistry
}

export function getSourceSyncAdapter(
  registry: SourceSyncRegistry,
  sourceType: ConnectorSourceType
) {
  return registry[sourceType] ?? null
}
