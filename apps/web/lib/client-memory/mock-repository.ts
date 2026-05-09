import { ALL_CLIENTS } from "@/lib/clients"
import { SOURCES } from "@/lib/sources"
import type { ClientMemoryRepository } from "@/lib/client-memory/repository"
import type { ClientDetail } from "@/lib/clients"
import type { DataSource } from "@/lib/sources"

export type MockClientMemoryRepositoryOptions = {
  clients?: ClientDetail[]
  sources?: DataSource[]
}

export function createMockClientMemoryRepository({
  clients = ALL_CLIENTS,
  sources = SOURCES,
}: MockClientMemoryRepositoryOptions = {}): ClientMemoryRepository {
  return {
    async listClients() {
      return [...clients]
    },
    async getRecentClients(limit = 5) {
      return clients.slice(0, limit)
    },
    async findClientBySlug(slug) {
      return clients.find((client) => client.slug === slug) ?? null
    },
    async listDataSources() {
      return [...sources]
    },
  }
}

export const mockClientMemoryRepository = createMockClientMemoryRepository()
