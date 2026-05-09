import { mockClientMemoryRepository } from "@/lib/client-memory/mock-repository"
import type {
  ClientMemoryRepository,
  ClientNavItem,
} from "@/lib/client-memory/repository"

export function getClientMemoryRepository(): ClientMemoryRepository {
  return mockClientMemoryRepository
}

export async function loadClientNavItems(
  repository: ClientMemoryRepository = getClientMemoryRepository()
): Promise<ClientNavItem[]> {
  const clients = await repository.listClients()
  return clients.map(({ slug, name }) => ({ slug, name }))
}
