import { mockClientMemoryRepository } from "@/lib/client-memory/mock-repository"
import type {
  ClientMemoryRepository,
  ClientNavItem,
} from "@/lib/client-memory/repository"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import type { WorkspaceRequestContext } from "@/features/data-sources/request-context"
import { createWorkspaceClientMemoryRepository } from "@/features/clients/repository"
import { createSupabaseClientStore } from "@/features/clients/supabase-store"

export function getClientMemoryRepository(): ClientMemoryRepository {
  return mockClientMemoryRepository
}

export function createClientMemoryRepositoryFromContext(
  context: WorkspaceRequestContext
): ClientMemoryRepository {
  return createWorkspaceClientMemoryRepository({
    workspaceId: context.activeWorkspace.id,
    reader: createSupabaseClientStore({ client: context.supabase }),
  })
}

export async function loadClientMemoryRepository(): Promise<ClientMemoryRepository> {
  const context = await createWorkspaceRequestContext()
  if (!context) return getClientMemoryRepository()

  return createClientMemoryRepositoryFromContext(context)
}

export async function loadClientNavItems(
  repository?: ClientMemoryRepository
): Promise<ClientNavItem[]> {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  const clients = await clientRepository.listClients()
  return clients.map(({ slug, name }) => ({ slug, name }))
}
