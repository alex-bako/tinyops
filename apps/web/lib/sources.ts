const SOURCE_ID_VALUES = [
  "imap",
  "csv",
  "forms",
  "stripe",
  "mailerlite",
  "calendly",
  "teachable",
] as const

export type SourceId = (typeof SOURCE_ID_VALUES)[number]

export const SOURCE_IDS: SourceId[] = [...SOURCE_ID_VALUES]

export type DataSourceIcon =
  | "mail"
  | "file-text"
  | "clipboard-list"
  | "credit-card"
  | "calendar"
  | "graduation-cap"
  | "send"

export type DataSourceAuth = "oauth" | "apikey" | "imap" | "csv"

export type DataSourceHealth = "healthy" | "stale" | "error"

export type DataSourceStatId =
  | "synced"
  | "events"
  | "window"
  | "imported"
  | "matched"
  | "new"
  | "submissions"
  | "sensitive"

export type DataSourceStat = {
  id: DataSourceStatId
  label: string
  value: string
}

export type DataSource = {
  id: SourceId
  icon: DataSourceIcon
  title: string
  sub: string
  category: string
  auth: DataSourceAuth
  connected: boolean
  isNew?: boolean
  health?: DataSourceHealth
  lastSync?: string
  summaryStatId?: DataSourceStatId
  stats: DataSourceStat[]
}

export type HomeSourceRow = {
  id: SourceId
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  status: string
}

export const SOURCES: DataSource[] = [
  {
    id: "imap",
    icon: "mail",
    title: "IMAP mailbox",
    sub: "hello@yourpractice.com",
    category: "Mail",
    auth: "imap",
    connected: true,
    health: "healthy",
    lastSync: "2 minutes ago",
    summaryStatId: "synced",
    stats: [
      { id: "synced", label: "Synced", value: "2m ago" },
      { id: "events", label: "Events", value: "8,412" },
      { id: "window", label: "Window", value: "12 mo" },
    ],
  },
  {
    id: "csv",
    icon: "file-text",
    title: "CSV upload",
    sub: "march-cohort.csv · 142 rows",
    category: "Files",
    auth: "csv",
    connected: true,
    health: "stale",
    lastSync: "3 days ago",
    summaryStatId: "imported",
    stats: [
      { id: "imported", label: "Imported", value: "3d ago" },
      { id: "matched", label: "Matched", value: "138" },
      { id: "new", label: "New", value: "4" },
    ],
  },
  {
    id: "forms",
    icon: "clipboard-list",
    title: "Google Forms",
    sub: "Intake + monthly feedback",
    category: "Forms",
    auth: "oauth",
    connected: true,
    health: "healthy",
    lastSync: "1 week ago",
    summaryStatId: "imported",
    stats: [
      { id: "imported", label: "Imported", value: "1w ago" },
      { id: "submissions", label: "Submissions", value: "203" },
      { id: "sensitive", label: "Sensitive", value: "27" },
    ],
  },
  {
    id: "stripe",
    icon: "credit-card",
    title: "Stripe",
    sub: "Payments, subscriptions, refunds",
    category: "Billing",
    auth: "oauth",
    connected: false,
    stats: [],
  },
  {
    id: "mailerlite",
    icon: "send",
    title: "MailerLite",
    sub: "Email marketing & automations",
    category: "Marketing",
    auth: "apikey",
    connected: false,
    isNew: true,
    stats: [],
  },
  {
    id: "calendly",
    icon: "calendar",
    title: "Calendly",
    sub: "Bookings, no-shows, reschedules",
    category: "Scheduling",
    auth: "oauth",
    connected: false,
    stats: [],
  },
  {
    id: "teachable",
    icon: "graduation-cap",
    title: "Teachable",
    sub: "Course enrollments & progress",
    category: "Learning",
    auth: "apikey",
    connected: false,
    stats: [],
  },
]

export function listSourceCatalogEntries(
  sources: DataSource[] = SOURCES
): DataSource[] {
  return [...sources]
}

export function connectedSources(sources: DataSource[] = SOURCES): DataSource[] {
  return sources.filter((source) => source.connected)
}

export function availableSources(sources: DataSource[] = SOURCES): DataSource[] {
  return sources.filter((source) => !source.connected)
}

export function sourceStatusLabel(source: DataSource): string {
  if (!source.connected) return "Not connected"
  if (!source.summaryStatId) return "Connected"
  return (
    source.stats.find((stat) => stat.id === source.summaryStatId)?.value ??
    "Connected"
  )
}

export function findSourceById(
  id: string,
  sources: DataSource[] = SOURCES
): DataSource | null {
  return sources.find((source) => source.id === id) ?? null
}

export function homeSourceRows(
  sources: DataSource[] = SOURCES
): HomeSourceRow[] {
  return connectedSources(sources).map((source) => ({
    id: source.id,
    icon: source.icon,
    title: source.title,
    sub: source.sub,
    connected: source.connected,
    status: sourceStatusLabel(source),
  }))
}
