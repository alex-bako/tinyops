import type { TimelineTone } from "@workspace/ui/components/timeline"

import {
  isSensitiveLevel,
  type ClientTimelineEvent,
  type TimelineEventType,
} from "@/features/clients/domain/client-profile"
import { stripQuotedReplyChain } from "@/features/clients/domain/timeline-event-body-quotes"
import { timelineEventBodyToText } from "@/features/clients/domain/timeline-event-body"

export type ClientTimelineBodyItem =
  | { kind: "text"; text: string }
  | { kind: "qa"; question: string; answer: string }

export type ClientTimelineEventView = {
  eventKey: string
  type: TimelineEventType
  date: string
  title: string
  summary: string
  bodyItems: ClientTimelineBodyItem[]
  sensitive: boolean
  tone: TimelineTone
  sourceLabel: string
}

export type ClientNoteAuthorView = {
  name: string | null
}

export type ClientNoteView = {
  id: string
  text: string
  dateLabel: string
  occurredAt: string
  parentEventId: string | null
  author: ClientNoteAuthorView | null
}

const TONE_OF: Record<TimelineEventType, TimelineTone> = {
  email: "brand",
  form: "positive",
  sent: "attention",
  csvimport: "neutral",
  note: "neutral",
}

const LABEL_OF: Record<TimelineEventType, string> = {
  email: "email",
  form: "form",
  sent: "sent",
  csvimport: "csv import",
  note: "note",
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
    type: event.type,
    date: formatTimelineDate(event.occurredAt),
    // Notes carry no subject line; the body is the content, so we suppress the
    // redundant "Manual note" heading and let the label distinguish them.
    title: event.type === "note" ? "" : event.display.title,
    summary: event.display.summary,
    bodyItems: event.body.blocks.map(toBodyItem),
    sensitive,
    tone: TONE_OF[event.type],
    sourceLabel: `${LABEL_OF[event.type]}${sensitive ? " · sensitive" : ""}`,
  }
}

/**
 * Shapes a note event for either notes surface (client-level or per-event).
 * `dateLabel` is an absolute SSR-safe fallback; the UI upgrades it to a
 * relative label client-side from `occurredAt`.
 */
export function createNoteView(event: ClientTimelineEvent): ClientNoteView {
  return {
    id: event.id,
    text: timelineEventBodyToText(event.body),
    dateLabel: formatTimelineDate(event.occurredAt),
    occurredAt: event.occurredAt,
    parentEventId: event.parentEventId,
    author: event.author ? { name: event.author.name } : null,
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
