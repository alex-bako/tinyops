import {
  SOURCES,
  findSourceById,
  listSourceCatalogEntries,
  type DataSource,
} from "@/lib/sources"
import type { SourceCatalogRepository } from "@/lib/source-catalog/repository"

export type MockSourceCatalogRepositoryOptions = {
  sources?: DataSource[]
}

export function createMockSourceCatalogRepository({
  sources = SOURCES,
}: MockSourceCatalogRepositoryOptions = {}): SourceCatalogRepository {
  return {
    async listDataSources() {
      return listSourceCatalogEntries(sources)
    },
    async findDataSourceById(id) {
      return findSourceById(id, sources)
    },
    async resolveSourceTitle(id) {
      return findSourceById(id, sources)?.title
    },
  }
}

export const mockSourceCatalogRepository = createMockSourceCatalogRepository()
