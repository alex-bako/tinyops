import type { DataSource, SourceId } from "@/lib/sources"

export type SourceNavItem = Pick<DataSource, "id" | "title">

export type SourceCatalogRepository = {
  listDataSources(): Promise<DataSource[]>
  findDataSourceById(id: string): Promise<DataSource | null>
  resolveSourceTitle(id: string): Promise<string | undefined>
}

export type { SourceId }
