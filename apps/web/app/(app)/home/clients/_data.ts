import { loadClientMemoryRepository } from "@/lib/client-memory/loaders"
import type { ClientMemoryRepository } from "@/lib/client-memory/repository"

export async function loadClientRows(repository?: ClientMemoryRepository) {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  return clientRepository.listClients()
}
