export type ClientStatus = "active" | "inactive" | "sensitive"

export type BadgeKind = "neutral" | "active" | "warn" | "brand" | "sensitive"

export type RecentClient = {
  name: string
  email: string
  since: string
  sources: number
  status: ClientStatus
}

export type AttentionItem = {
  num: number
  label: string
  badge: { kind: BadgeKind; text: string }
}

export type DataSource = {
  icon: "mail" | "file-text" | "clipboard-list"
  name: string
  sub: string
  state: string
  active: boolean
}

export type WeekTask = {
  tone: "cobalt" | "mint"
  icon: "sparkles" | "message-square"
  title: string
  sub: string
  badge: { kind: BadgeKind; text: string }
}

export const RECENT_CLIENTS: RecentClient[] = [
  {
    name: "Anna Smith",
    email: "anna@example.com",
    since: "12d ago",
    sources: 3,
    status: "active",
  },
  {
    name: "Mariko Tan",
    email: "mariko.t@example.com",
    since: "3d ago",
    sources: 4,
    status: "active",
  },
  {
    name: "Luca De Rossi",
    email: "luca.derossi@gmail.com",
    since: "5w ago",
    sources: 2,
    status: "inactive",
  },
  {
    name: "Sara Berger",
    email: "s.berger@example.de",
    since: "2d ago",
    sources: 5,
    status: "sensitive",
  },
  {
    name: "Priya Raman",
    email: "priya@example.com",
    since: "yesterday",
    sources: 3,
    status: "active",
  },
]

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

export const SOURCES: DataSource[] = [
  {
    icon: "mail",
    name: "IMAP mailbox",
    sub: "hello@yourpractice.com",
    state: "2m ago",
    active: true,
  },
  {
    icon: "file-text",
    name: "march-cohort.csv",
    sub: "142 rows · 4 new",
    state: "3d ago",
    active: false,
  },
  {
    icon: "clipboard-list",
    name: "Intake form",
    sub: "203 submissions",
    state: "1w ago",
    active: false,
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
