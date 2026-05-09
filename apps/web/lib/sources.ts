export type DataSourceIcon =
  | "mail"
  | "file-text"
  | "clipboard-list"
  | "credit-card"
  | "calendar"
  | "graduation-cap"

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
  id: string
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  summaryStatId?: DataSourceStatId
  stats: DataSourceStat[]
}

export type HomeSourceRow = {
  id: string
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
    connected: true,
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
    connected: true,
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
    connected: true,
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
    sub: "Connect to import payments",
    connected: false,
    stats: [],
  },
  {
    id: "calendly",
    icon: "calendar",
    title: "Calendly",
    sub: "Connect to import bookings",
    connected: false,
    stats: [],
  },
  {
    id: "teachable",
    icon: "graduation-cap",
    title: "Teachable",
    sub: "Connect to import course progress",
    connected: false,
    stats: [],
  },
]

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
