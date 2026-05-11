import { loadClientMemoryRepository } from "@/features/clients/adapters/client-memory-loader"
import type { ClientMemoryRepositoryPort } from "@/features/clients/application/client-memory"

export async function loadClientRows(repository?: ClientMemoryRepositoryPort) {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  return clientRepository.listClients()
}
