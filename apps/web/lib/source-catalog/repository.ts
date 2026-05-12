import type { DataSource, SourceId } from "@/lib/sources"

export type SourceNavItem = {
  sourceType: string
  sourceSlug: string
  title: string
}

export type SourceCatalogRepository = {
  listDataSources(): Promise<DataSource[]>
  findDataSourceById(id: string): Promise<DataSource | null>
  resolveSourceTitle(id: string): Promise<string | undefined>
}

export type { SourceId }
