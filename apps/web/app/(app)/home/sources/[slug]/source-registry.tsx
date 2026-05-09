import type * as React from "react"

import type { DataSource, SourceId } from "@/lib/sources"

import { ApiKeyConnect } from "./_components/connection-blocks/apikey-connect"
import { CalendlyConfig } from "./_components/config-blocks/calendly-config"
import { CsvConfig } from "./_components/config-blocks/csv-config"
import { CsvConnect } from "./_components/connection-blocks/csv-connect"
import { FormsConfig } from "./_components/config-blocks/forms-config"
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
  imap: [
    {
      when: "2m ago",
      what: "Synced 14 messages · 2 attached to clients, 12 archived.",
    },
    { when: "1h ago", what: "New client created from sender · S. Halvorsen." },
    { when: "3h ago", what: "Skipped 4 messages by rule · *@noreply.*" },
  ],
  forms: [
    { when: "1w ago", what: "203 submissions imported across 2 forms." },
    { when: "1w ago", what: "27 responses flagged sensitive · review queue." },
  ],
  csv: [
    {
      when: "3d ago",
      what: "Imported march-cohort.csv · 138 matched, 4 new clients.",
    },
    { when: "3d ago", what: "1 row skipped — invalid email." },
  ],
} satisfies Partial<Record<SourceId, SourceActivityRow[]>>

export const SOURCE_UI_REGISTRY: Record<SourceId, SourceUiRegistryEntry> = {
  imap: {
    id: "imap",
    Connection: ImapConnect,
    Config: ImapConfig,
    logoClassName: "bg-cobalt-500/12 text-cobalt-700",
    activity: ACTIVITY.imap,
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
    Connection: OAuthConnect,
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
