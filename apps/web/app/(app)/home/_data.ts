import type { Client, ClientDetail, ClientStatus } from "@/features/clients/application/client-memory"
import { loadClientMemoryRepository } from "@/features/clients/adapters/client-memory-loader"
import type { ClientMemoryRepositoryPort } from "@/features/clients/application/client-memory"
import { getSourceCatalogRepository } from "@/lib/source-catalog/loaders"
import type { SourceCatalogRepository } from "@/lib/source-catalog/repository"
import { homeSourceRows, type DataSource } from "@/lib/sources"

export type { ClientStatus, Client, DataSource }
export type RecentClient = ClientDetail

export type BadgeKind = "neutral" | "active" | "warn" | "brand" | "sensitive"

export type AttentionItem = {
  num: number
  label: string
  badge: { kind: BadgeKind; text: string }
}

export type WeekTask = {
  tone: "cobalt" | "mint"
  icon: "sparkles" | "message-square"
  title: string
  sub: string
  badge: { kind: BadgeKind; text: string }
}

export const ATTENTION: AttentionItem[] = [
  {
    num: 8,
    label: "clients overdue for a follow-up",
    badge: { kind: "warn", text: "Review" },
  },
  {
    num: 3,
    label: "drafts pending approval",
    badge: { kind: "brand", text: "3 to review" },
  },
  {
    num: 2,
    label: "sensitive items flagged manually",
    badge: { kind: "sensitive", text: "Sensitive" },
  },
  {
    num: 14,
    label: "inactive participants from March",
    badge: { kind: "neutral", text: "Idle" },
  },
]

export const WEEK_TASKS: WeekTask[] = [
  {
    tone: "cobalt",
    icon: "sparkles",
    title: "Monthly check-in · March cohort",
    sub: "47 drafts · 3 sensitive · last regenerated 2h ago",
    badge: { kind: "brand", text: "Ready to review" },
  },
  {
    tone: "mint",
    icon: "message-square",
    title: "Feedback request · February replays",
    sub: "Scheduled for Friday · 28 recipients",
    badge: { kind: "neutral", text: "Scheduled" },
  },
]

export async function loadHomePageData(
  repository?: ClientMemoryRepositoryPort,
  sourceCatalog: SourceCatalogRepository | DataSource[] = getSourceCatalogRepository()
) {
  const clientRepository = repository ?? (await loadClientMemoryRepository())
  const [recentClients, sources] = await Promise.all([
    clientRepository.getRecentClients(5),
    Array.isArray(sourceCatalog)
      ? Promise.resolve(sourceCatalog)
      : sourceCatalog.listDataSources(),
  ])

  return {
    recentClients,
    homeSources: homeSourceRows(sources),
  }
}
