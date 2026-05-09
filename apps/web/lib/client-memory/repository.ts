import type { ClientDetail } from "@/lib/clients"
import type { DataSource } from "@/lib/sources"

export type ClientMemoryRepository = {
  listClients(): Promise<ClientDetail[]>
  getRecentClients(limit?: number): Promise<ClientDetail[]>
  findClientBySlug(slug: string): Promise<ClientDetail | null>
  listDataSources(): Promise<DataSource[]>
}

export type ClientNavItem = Pick<ClientDetail, "slug" | "name">
