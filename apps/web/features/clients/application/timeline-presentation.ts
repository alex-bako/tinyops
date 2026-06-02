import type { TimelineTone } from "@workspace/ui/components/timeline"

import {
  isSensitiveLevel,
  type ClientTimelineEvent,
  type TimelineEventType,
} from "@/features/clients/domain/client-profile"
import { stripQuotedReplyChain } from "@/features/clients/domain/timeline-event-body-quotes"

export type ClientTimelineBodyItem =
  | { kind: "text"; text: string }
  | { kind: "qa"; question: string; answer: string }

export type ClientTimelineEventView = {
  eventKey: string
  date: string
  title: string
  summary: string
  bodyItems: ClientTimelineBodyItem[]
  sensitive: boolean
  tone: TimelineTone
  sourceLabel: string
}

const TONE_OF: Record<TimelineEventType, TimelineTone> = {
  email: "brand",
  form: "positive",
  sent: "attention",
  csvimport: "neutral",
}

const LABEL_OF: Record<TimelineEventType, string> = {
  email: "email",
  form: "form",
  sent: "sent",
  csvimport: "csv import",
}

const DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
})

export function createTimelineEventViews(
  events: ClientTimelineEvent[]
): ClientTimelineEventView[] {
  return events.map(createTimelineEventView)
}

export function createTimelineEventView(
  event: ClientTimelineEvent
): ClientTimelineEventView {
  const sensitive = isSensitiveLevel(event.sensitivityLevel)
  return {
    eventKey: event.id,
    date: formatTimelineDate(event.occurredAt),
    title: event.display.title,
    summary: event.display.summary,
    bodyItems: event.body.blocks.map(toBodyItem),
    sensitive,
    tone: TONE_OF[event.type],
    sourceLabel: `${LABEL_OF[event.type]}${sensitive ? " · sensitive" : ""}`,
  }
}

function toBodyItem(
  block: ClientTimelineEvent["body"]["blocks"][number]
): ClientTimelineBodyItem {
  if (block.kind === "text") {
    return { kind: "text", text: stripQuotedReplyChain(block.text) }
  }
  return { ...block }
}

function formatTimelineDate(value: string): string {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FORMATTER.format(date)
}
