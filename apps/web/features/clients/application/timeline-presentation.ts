import type { TimelineTone } from "@workspace/ui/components/timeline"

import {
  isSensitiveLevel,
  type ClientTimelineEvent,
  type TimelineEventType,
} from "@/features/clients/domain/client-profile"

export type ClientTimelineEventView = {
  eventKey: string
  date: string
  title: string
  summary: string
  detailText: string
  sensitive: boolean
  tone: TimelineTone
  sourceLabel: string
  collapsedLabel: string
  expandedLabel: string
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
    title: event.title,
    summary: event.summary,
    detailText: event.bodyText.trim() || event.summary,
    sensitive,
    tone: TONE_OF[event.type],
    sourceLabel: `${LABEL_OF[event.type]}${sensitive ? " · sensitive" : ""}`,
    collapsedLabel: sensitive ? "Show sensitive event" : "Show full event",
    expandedLabel: sensitive ? "Hide sensitive event" : "Hide full event",
  }
}

function formatTimelineDate(value: string): string {
  if (!value) return "Unknown"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return DATE_FORMATTER.format(date)
}
