import type { ClientMemoryRepository } from "@/lib/client-memory/repository"
import { mapClientProfileToDetail } from "@/features/clients/mappers"
import type { ClientReader } from "@/features/clients/types"

export function createWorkspaceClientMemoryRepository({
  workspaceId,
  reader,
}: {
  workspaceId: string
  reader: ClientReader
}): ClientMemoryRepository {
  return {
    async listClients() {
      return (await reader.listClients(workspaceId)).map(mapClientProfileToDetail)
    },
    async getRecentClients(limit) {
      return (await reader.getRecentClients(workspaceId, limit)).map(
        mapClientProfileToDetail
      )
    },
    async findClientBySlug(slug) {
      const profile = await reader.findClientBySlug({ workspaceId, slug })
      return profile ? mapClientProfileToDetail(profile) : null
    },
  }
}
