import type { NormalizedConnectorRecord } from "@/features/clients/application/connector-ingestion"
import { matchesIntakeFilters } from "@/features/data-sources/imap-intake-filters"
import type { ImapMessageFacts } from "@/features/data-sources/imap-message-facts"
import type {
  ImapThreadHeaders,
  createImapThreadIndex,
} from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"

export type ImapThreadImportDecision =
  | { import: true; reason: "filter_anchor"; anchored: true }
  | { import: true; reason: "thread_member" | "thread_reply"; anchored: false }
  | { import: false; reason: "filter_rejected" | "unlinked_sent_message" }

export function decideImapThreadImport({
  source,
  facts,
  threadIndex,
}: {
  source: ImapDataSource
  facts: ImapThreadImportFacts
  threadIndex: ReturnType<typeof createImapThreadIndex>
}): ImapThreadImportDecision {
  const linked = threadIndex.isLinked(facts.headers)
  if (facts.eventType === "email_sent") {
    return linked
      ? { import: true, reason: "thread_reply", anchored: false }
      : { import: false, reason: "unlinked_sent_message" }
  }
  if (matchesIntakeFilters(source, facts)) {
    return { import: true, reason: "filter_anchor", anchored: true }
  }
  return linked
    ? { import: true, reason: "thread_member", anchored: false }
    : { import: false, reason: "filter_rejected" }
}

type ImapThreadImportFacts = ImapMessageFacts & {
  headers: ImapThreadHeaders
  eventType: Extract<
    NormalizedConnectorRecord["eventType"],
    "email_received" | "email_sent"
  >
}
