"use server"

import type { ClientSearchResult } from "@/features/clients/application/client-memory"
import { createClientQueryServerContext } from "@/features/clients/loaders"

/**
 * Searches the active workspace's clients by name or email for the home search
 * bar. Returns an empty list when unauthenticated or the query is blank, so the
 * caller never has to special-case those.
 */
export async function searchClientsAction(
  query: string
): Promise<ClientSearchResult[]> {
  if (!query.trim()) return []

  const context = await createClientQueryServerContext()
  if (!context) return []

  return context.application.searchClients(query)
}
