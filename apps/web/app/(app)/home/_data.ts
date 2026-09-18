import type { Client, ClientDetail, ClientStatus } from "@/features/clients/application/client-memory"
import { loadClientMemoryRepository } from "@/features/clients/adapters/client-memory-loader"
import type { ClientMemoryRepositoryPort } from "@/features/clients/application/client-memory"
import { getSourceCatalogRepository } from "@/lib/source-catalog/loaders"
import type { SourceCatalogRepository } from "@/lib/source-catalog/repository"
import { homeSourceRows, type DataSource } from "@/lib/sources"

export type { ClientStatus, Client, DataSource }
export type RecentClient = ClientDetail

export async function loadHomePageData(
  repository?: ClientMemoryRepositoryPort,
  sourceCatalog: SourceCatalogRepository | DataSource[] = getSourceCatalogRepository()
) {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  const [recentClients, sources] = await Promise.all([
    clientRepository.getRecentClients(5),
    Array.isArray(sourceCatalog)
      ? Promise.resolve(sourceCatalog)
      : sourceCatalog.listDataSources(),
  ])

  return {
    recentClients,
    homeSources: homeSourceRows(sources),
  }
}
