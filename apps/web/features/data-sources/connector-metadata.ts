const CONNECTOR_ID_VALUES = [
  "imap",
  "csv",
  "forms",
  "stripe",
  "mailerlite",
  "calendly",
  "teachable",
] as const

export type ConnectorId = (typeof CONNECTOR_ID_VALUES)[number]

export const CONNECTOR_IDS: ConnectorId[] = [...CONNECTOR_ID_VALUES]

export type DataSourceIcon =
  | "mail"
  | "file-text"
  | "forms"
  | "stripe"
  | "calendly"
  | "teachable"
  | "mailerlite"
  | "plug"

export type DataSourceAuth = "oauth" | "apikey" | "imap" | "csv" | "multi"

export type ConnectorMetadata = {
  id: ConnectorId
  icon: DataSourceIcon
  title: string
  sub: string
  category: string
  auth: DataSourceAuth
  isNew?: boolean
}

export const CONNECTOR_METADATA: ConnectorMetadata[] = [
  {
    id: "imap",
    icon: "mail",
    title: "IMAP mailbox",
    sub: "Read email threads from any IMAP mailbox",
    category: "Mail",
    auth: "imap",
  },
  {
    id: "csv",
    icon: "file-text",
    title: "CSV upload",
    sub: "Import client lists and form exports",
    category: "Files",
    auth: "csv",
  },
  {
    id: "forms",
    icon: "forms",
    title: "Google Forms",
    sub: "Import intake and feedback responses",
    category: "Forms",
    auth: "multi",
  },
  {
    id: "stripe",
    icon: "stripe",
    title: "Stripe",
    sub: "Payments, subscriptions, refunds",
    category: "Billing",
    auth: "oauth",
  },
  {
    id: "mailerlite",
    icon: "mailerlite",
    title: "MailerLite",
    sub: "Email marketing & automations",
    category: "Marketing",
    auth: "apikey",
    isNew: true,
  },
  {
    id: "calendly",
    icon: "calendly",
    title: "Calendly",
    sub: "Bookings, no-shows, reschedules",
    category: "Scheduling",
    auth: "oauth",
  },
  {
    id: "teachable",
    icon: "teachable",
    title: "Teachable",
    sub: "Course enrollments & progress",
    category: "Learning",
    auth: "apikey",
  },
]

export function listConnectorMetadata(
  metadata: ConnectorMetadata[] = CONNECTOR_METADATA
): ConnectorMetadata[] {
  return [...metadata]
}

export function getConnectorMetadata(id: ConnectorId): ConnectorMetadata {
  return CONNECTOR_METADATA.find((connector) => connector.id === id)!
}

export function isConnectorId(value: string): value is ConnectorId {
  return CONNECTOR_ID_VALUES.includes(value as ConnectorId)
}
