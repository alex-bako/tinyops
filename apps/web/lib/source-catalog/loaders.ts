import { mockSourceCatalogRepository } from "@/lib/source-catalog/mock-repository"
import type {
  SourceCatalogRepository,
  SourceNavItem,
} from "@/lib/source-catalog/repository"

export function getSourceCatalogRepository(): SourceCatalogRepository {
  return mockSourceCatalogRepository
}

export async function loadSourceNavItems(
  repository: SourceCatalogRepository = getSourceCatalogRepository()
): Promise<SourceNavItem[]> {
  const sources = await repository.listDataSources()
  return sources.flatMap((source) =>
    source.kind === "data_source"
      ? [
          {
            sourceType: source.sourceType,
            sourceSlug: source.sourceSlug,
            title: source.title,
          },
        ]
      : []
  )
}
