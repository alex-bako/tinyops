import type { ClientDetail } from "@/lib/clients"

export type ClientMemoryRepository = {
  listClients(): Promise<ClientDetail[]>
  getRecentClients(limit?: number): Promise<ClientDetail[]>
  findClientBySlug(slug: string): Promise<ClientDetail | null>
}

export type ClientNavItem = Pick<ClientDetail, "slug" | "name">
