import {
  createWorkspaceClientMemoryRepository,
  type ClientMemoryRepositoryPort,
  type ClientNavItem,
} from "@/features/clients/application/client-memory"
import { canManageNotes } from "@/features/clients/application/notes-policy"
import { canManageProperties } from "@/features/clients/application/properties-policy"
import { composePersonName } from "@/features/clients/domain/client-profile"
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

export type ClientDetailPageAccess = {
  repository: ClientMemoryRepositoryPort
  canManageNotes: boolean
  canManageProperties: boolean
  /** Display name of the acting user, for optimistic note authorship. */
  currentUserName: string | null
}

/**
 * Resolves the client repository, the caller's note-management permission, and
 * the caller's display name from a single workspace context, so the detail page
 * avoids a duplicate round-trip. Falls back to the mock repository (read-only)
 * when unauthenticated.
 */
export async function loadClientDetailPageAccess(): Promise<ClientDetailPageAccess> {
  const context = await createWorkspaceRequestContext()
  if (!context) {
    return {
      repository: getClientMemoryRepository(),
      canManageNotes: false,
      canManageProperties: false,
      currentUserName: null,
    }
  }

  return {
    repository: createClientMemoryRepositoryFromContext(context),
    canManageNotes: canManageNotes(context.activeWorkspace.role),
    canManageProperties: canManageProperties(context.activeWorkspace.role),
    currentUserName: composePersonName({
      firstName: context.session.profile?.firstName ?? null,
      lastName: context.session.profile?.lastName ?? null,
      email: context.session.email,
    }),
  }
}

export async function loadClientNavItems(
  repository?: ClientMemoryRepositoryPort
): Promise<ClientNavItem[]> {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  const clients = await clientRepository.listClients()
  return clients.map(({ slug, name }) => ({ slug, name }))
}
