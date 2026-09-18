import type { ClientStatus } from "@/features/clients/application/client-memory"
import type { DataSourceIcon, HomeSourceRow } from "@/lib/sources"

/** A client, narrowed to what the search dropdown renders. */
export type ClientSearchItem = {
  slug: string
  name: string
  email: string
  status: ClientStatus
}

/** Recently-viewed clients render exactly like matched ones. */
export type RecentClientItem = ClientSearchItem

export type ActionIcon = "plus" | "settings" | "sparkles" | "upload"

export type SearchItem =
  | {
      kind: "client"
      key: string
      slug: string
      name: string
      email: string
      status: ClientStatus
      disabled?: false
    }
  | {
      kind: "source"
      key: string
      sourceId: string
      icon: DataSourceIcon
      title: string
      sub: string
      connected: boolean
      status: string
      disabled?: false
    }
  | {
      kind: "action"
      key: string
      label: string
      icon: ActionIcon
      href?: string
      soon?: boolean
      disabled?: boolean
    }
  | { kind: "ask"; key: string; query: string; disabled: true }

export type SearchGroup = {
  label: string
  /** Total match count; the view shows a badge only when it exceeds five. */
  count?: number
  items: SearchItem[]
}

export type SearchModel = {
  query: string
  groups: SearchGroup[]
  noResults: boolean
}

/**
 * The dropdown is a jump list, not the list itself — the rows below already
 * show every match, so only the first few are worth offering.
 */
const CLIENT_MATCH_LIMIT = 8

/**
 * Quick actions. Real navigations first, then a roadmap placeholder marked
 * "Soon" so the action is visible but never lands on a dead end.
 */
export const QUICK_ACTIONS: SearchItem[] = [
  { kind: "action", key: "add-source", label: "Add a data source", icon: "plus", href: "/home/sources" },
  { kind: "action", key: "settings", label: "Workspace settings", icon: "settings", href: "/home/settings" },
  { kind: "action", key: "new-checkin", label: "New monthly check-in", icon: "sparkles", soon: true, disabled: true },
]

export function filterSources(
  sources: HomeSourceRow[],
  query: string
): HomeSourceRow[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return sources.filter((s) =>
    `${s.title} ${s.sub}`.toLowerCase().includes(q)
  )
}

function clientToItem(c: ClientSearchItem): SearchItem {
  return {
    kind: "client",
    key: c.slug,
    slug: c.slug,
    name: c.name,
    email: c.email,
    status: c.status,
  }
}

function sourceToItem(s: HomeSourceRow): SearchItem {
  return {
    kind: "source",
    key: s.id,
    sourceId: s.id,
    icon: s.icon,
    title: s.title,
    sub: s.sub,
    connected: s.connected,
    status: s.status,
  }
}

export function buildSearchModel({
  query,
  clientMatches,
  sources,
  recentClients,
}: {
  query: string
  /** The rows the list is already showing, so the two can never disagree. */
  clientMatches: ClientSearchItem[]
  sources: HomeSourceRow[]
  recentClients: RecentClientItem[]
}): SearchModel {
  const trimmed = query.trim()

  if (!trimmed) {
    const groups: SearchGroup[] = []
    if (recentClients.length) {
      groups.push({
        label: "Recently viewed",
        items: recentClients.map(clientToItem),
      })
    }
    groups.push({ label: "Quick actions", items: QUICK_ACTIONS })
    return { query, groups, noResults: false }
  }

  // Ask AI always leads when typing, but it is a disabled "Soon" affordance —
  // there is no /ask route or AI backend yet.
  const askGroup: SearchGroup = {
    label: "Ask AI",
    items: [{ kind: "ask", key: "ask", query: trimmed, disabled: true }],
  }

  const clientItems = clientMatches.slice(0, CLIENT_MATCH_LIMIT).map(clientToItem)
  const sourceItems = filterSources(sources, trimmed).map(sourceToItem)
  const lc = trimmed.toLowerCase()
  const actionItems = QUICK_ACTIONS.filter((a) =>
    a.kind === "action" ? a.label.toLowerCase().includes(lc) : false
  )

  const noResults = clientItems.length === 0 && sourceItems.length === 0

  const groups: SearchGroup[] = [askGroup]
  if (!noResults) {
    if (clientItems.length) {
      groups.push({
        label: "Clients",
        count: clientMatches.length,
        items: clientItems,
      })
    }
    if (sourceItems.length) {
      groups.push({ label: "Data sources", items: sourceItems })
    }
    if (actionItems.length) {
      groups.push({ label: "Quick actions", items: actionItems })
    }
  }

  return { query, groups, noResults }
}
