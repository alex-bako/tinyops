import {
  createWorkspaceClientMemoryRepository,
  type ClientMemoryRepositoryPort,
  type ClientNavItem,
} from "@/features/clients/application/client-memory"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import type { WorkspaceRequestContext } from "@/features/data-sources/request-context"
import {
  mockClientMemoryRepository,
} from "@/features/clients/adapters/mock-client-memory"
import { createSupabaseClientReader } from "@/features/clients/adapters/supabase-client-reader"

export function getClientMemoryRepository(): ClientMemoryRepositoryPort {
  return mockClientMemoryRepository
}

export function createClientMemoryRepositoryFromContext(
  context: WorkspaceRequestContext
): ClientMemoryRepositoryPort {
  return createWorkspaceClientMemoryRepository({
    workspaceId: context.activeWorkspace.id,
    reader: createSupabaseClientReader({ client: context.supabase }),
  })
}

export async function loadClientMemoryRepository(): Promise<ClientMemoryRepositoryPort> {
  const context = await createWorkspaceRequestContext()
  if (!context) return getClientMemoryRepository()

  return createClientMemoryRepositoryFromContext(context)
}

export async function loadClientNavItems(
  repository?: ClientMemoryRepositoryPort
): Promise<ClientNavItem[]> {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  const clients = await clientRepository.listClients()
  return clients.map(({ slug, name }) => ({ slug, name }))
}
