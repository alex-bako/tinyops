import type { TimelineTone } from "@workspace/ui/components/timeline"

import {
  clientCohortBadge,
  clientDetailFlagBadges,
  clientStatusBadge,
  type ClientStateBadge,
} from "@/lib/client-state"
import type {
  ClientDetail,
  ClientMemory,
  ClientProperty,
  ClientTimelineEvent,
  TimelineEventType,
} from "@/lib/clients"

type ClientDetailHeaderView = {
  name: string
  email: string
  location: string
  badges: ClientStateBadge[]
}

type ClientMemoryView = {
  summary: string
  confidencePct: number
  confidenceWidth: string
  lastGenerated: string
}

type ClientTimelineEventView = Omit<ClientTimelineEvent, "type"> & {
  tone: TimelineTone
  sourceLabel: string
}

type ClientDetailView = {
  header: ClientDetailHeaderView
  memory: ClientMemoryView
  properties: ClientProperty[]
  propertiesCount: string
  timeline: ClientTimelineEventView[]
  timelineCount: string
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

function createMemoryView(memory: ClientMemory): ClientMemoryView {
  const confidencePct = Math.round(memory.confidence * 100)
  return {
    summary: memory.summary,
    confidencePct,
    confidenceWidth: `${confidencePct}%`,
    lastGenerated: memory.lastGenerated,
  }
}

function createTimelineView(
  events: ClientTimelineEvent[]
): ClientTimelineEventView[] {
  return events.map((event) => ({
    date: event.date,
    title: event.title,
    summary: event.summary,
    sensitive: event.sensitive,
    tone: TONE_OF[event.type],
    sourceLabel: `${LABEL_OF[event.type]}${
      event.sensitive ? " · sensitive" : ""
    }`,
  }))
}

function createClientDetailView(client: ClientDetail): ClientDetailView {
  const timelineShown = client.timeline.length
  const timelineTotal = Math.max(timelineShown, 9)

  return {
    header: {
      name: client.name,
      email: client.email,
      location: client.location,
      badges: [
        clientStatusBadge(client.status),
        clientCohortBadge(client.cohort),
        ...clientDetailFlagBadges(client.flags),
      ],
    },
    memory: createMemoryView(client.memory),
    properties: client.properties,
    propertiesCount: `${client.properties.length} fields`,
    timeline: createTimelineView(client.timeline),
    timelineCount: `${timelineTotal} events · ${timelineShown} shown`,
  }
}

export { createClientDetailView }
export type {
  ClientDetailHeaderView,
  ClientDetailView,
  ClientMemoryView,
  ClientTimelineEventView,
}
