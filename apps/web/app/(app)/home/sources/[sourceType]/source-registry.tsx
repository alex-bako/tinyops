import type * as React from "react"

import type { DataSource, SourceId } from "@/lib/sources"

import { ApiKeyConnect } from "./_components/connection-blocks/apikey-connect"
import { CalendlyConfig } from "./_components/config-blocks/calendly-config"
import { CsvConfig } from "./_components/config-blocks/csv-config"
import { CsvConnect } from "./_components/connection-blocks/csv-connect"
import { FormsConfig } from "./_components/config-blocks/forms-config"
import { FormsConnect } from "./_components/connection-blocks/forms-connect"
import { GmailConfig } from "./_components/config-blocks/gmail-config"
import { GmailConnect } from "./_components/connection-blocks/gmail-connect"
import { ImapConfig } from "./_components/config-blocks/imap-config"
import { ImapConnect } from "./_components/connection-blocks/imap-connect"
import { MailerLiteConfig } from "./_components/config-blocks/mailerlite-config"
import { OAuthConnect } from "./_components/connection-blocks/oauth-connect"
import { StripeConfig } from "./_components/config-blocks/stripe-config"
import { TeachableConfig } from "./_components/config-blocks/teachable-config"

export type SourceActivityRow = {
  when: string
  what: string
}

type SourceAdapterProps = {
  source: DataSource
}

export type SourceUiRegistryEntry = {
  id: SourceId
  Connection: React.ComponentType<SourceAdapterProps>
  Config: React.ComponentType<SourceAdapterProps>
  logoClassName: string
  activity: SourceActivityRow[]
}

const ACTIVITY = {
  imap: [],
  forms: [],
  csv: [],
} satisfies Partial<Record<SourceId, SourceActivityRow[]>>

export const SOURCE_UI_REGISTRY: Record<SourceId, SourceUiRegistryEntry> = {
  imap: {
    id: "imap",
    Connection: ImapConnect,
    Config: ImapConfig,
    logoClassName: "bg-cobalt-500/12 text-cobalt-700",
    activity: ACTIVITY.imap,
  },
  gmail: {
    id: "gmail",
    Connection: GmailConnect,
    Config: GmailConfig,
    logoClassName: "bg-[#EA4335] text-white",
    activity: [],
  },
  csv: {
    id: "csv",
    Connection: CsvConnect,
    Config: CsvConfig,
    logoClassName: "bg-[var(--tint-hover)] text-foreground",
    activity: ACTIVITY.csv,
  },
  forms: {
    id: "forms",
    Connection: FormsConnect,
    Config: FormsConfig,
    logoClassName: "bg-[#7B40F2] text-white",
    activity: ACTIVITY.forms,
  },
  stripe: {
    id: "stripe",
    Connection: OAuthConnect,
    Config: StripeConfig,
    logoClassName: "bg-[#635BFF] text-white",
    activity: [],
  },
  mailerlite: {
    id: "mailerlite",
    Connection: ApiKeyConnect,
    Config: MailerLiteConfig,
    logoClassName: "bg-[#18C964] text-[#0E1F0F]",
    activity: [],
  },
  calendly: {
    id: "calendly",
    Connection: OAuthConnect,
    Config: CalendlyConfig,
    logoClassName: "bg-[#006BFF] text-white",
    activity: [],
  },
  teachable: {
    id: "teachable",
    Connection: ApiKeyConnect,
    Config: TeachableConfig,
    logoClassName: "bg-[#F38B00] text-white",
    activity: [],
  },
}

export function getSourceUi(sourceId: SourceId): SourceUiRegistryEntry {
  return SOURCE_UI_REGISTRY[sourceId]
}
