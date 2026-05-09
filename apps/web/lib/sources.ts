import {
  CalendarIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  GraduationCapIcon,
  MailIcon,
  type LucideIcon,
} from "lucide-react"

export type DataSourceIcon =
  | "mail"
  | "file-text"
  | "clipboard-list"
  | "credit-card"
  | "calendar"
  | "graduation-cap"

export type DataSourceStat = { label: string; value: string }

export type DataSource = {
  id: string
  icon: DataSourceIcon
  title: string
  sub: string
  connected: boolean
  stats: DataSourceStat[]
}

export const SOURCE_ICON_MAP: Record<DataSourceIcon, LucideIcon> = {
  mail: MailIcon,
  "file-text": FileTextIcon,
  "clipboard-list": ClipboardListIcon,
  "credit-card": CreditCardIcon,
  calendar: CalendarIcon,
  "graduation-cap": GraduationCapIcon,
}

export const SOURCES: DataSource[] = [
  {
    id: "imap",
    icon: "mail",
    title: "IMAP mailbox",
    sub: "hello@yourpractice.com",
    connected: true,
    stats: [
      { label: "Synced", value: "2m ago" },
      { label: "Events", value: "8,412" },
      { label: "Window", value: "12 mo" },
    ],
  },
  {
    id: "csv",
    icon: "file-text",
    title: "CSV upload",
    sub: "march-cohort.csv · 142 rows",
    connected: true,
    stats: [
      { label: "Imported", value: "3d ago" },
      { label: "Matched", value: "138" },
      { label: "New", value: "4" },
    ],
  },
  {
    id: "forms",
    icon: "clipboard-list",
    title: "Google Forms",
    sub: "Intake + monthly feedback",
    connected: true,
    stats: [
      { label: "Imported", value: "1w ago" },
      { label: "Submissions", value: "203" },
      { label: "Sensitive", value: "27" },
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

export function connectedSources(): DataSource[] {
  return SOURCES.filter((s) => s.connected)
}

export function availableSources(): DataSource[] {
  return SOURCES.filter((s) => !s.connected)
}
