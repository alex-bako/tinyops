import { ALL_CLIENTS } from "@/lib/clients"
import type { ClientMemoryRepository } from "@/lib/client-memory/repository"
import type { ClientDetail } from "@/lib/clients"

export type MockClientMemoryRepositoryOptions = {
  clients?: ClientDetail[]
}

export function createMockClientMemoryRepository({
  clients = ALL_CLIENTS,
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
  }
}

export const mockClientMemoryRepository = createMockClientMemoryRepository()
