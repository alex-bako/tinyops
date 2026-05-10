import type { ClientReader } from "@/features/clients/types"

export function createClientQueryApplication({
  workspaceId,
  reader,
}: {
  workspaceId: string
  reader: ClientReader
}) {
  return {
    listClients() {
      return reader.listClients(workspaceId)
    },

    getRecentClients(limit = 5) {
      return reader.getRecentClients(workspaceId, limit)
    },

    findClientBySlug(slug: string) {
      return reader.findClientBySlug({ workspaceId, slug })
    },

    searchClients(query: string, limit = 8) {
      const normalized = query.trim().toLowerCase()
      if (!normalized) return Promise.resolve([])

      return reader.searchClients({
        workspaceId,
        query: normalized,
        limit,
      })
    },
  }
}
