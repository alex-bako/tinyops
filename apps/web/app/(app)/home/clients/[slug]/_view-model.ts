import {
  clientCohortBadge,
  clientDetailFlagBadges,
  clientStatusBadge,
  type ClientStateBadge,
} from "@/lib/client-state"
import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"
import type {
  ClientDetail,
  ClientMemory,
  ClientProperty,
} from "@/features/clients/application/client-memory"
import {
  createTimelineEventViews,
  type ClientTimelineEventView,
} from "@/features/clients/application/timeline-presentation"

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

type ClientDetailView = {
  header: ClientDetailHeaderView
  memory: ClientMemoryView
  properties: ClientProperty[]
  propertiesCount: string
  timeline: ClientTimelineEventView[]
  timelineCount: string
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
  return createTimelineEventViews(events)
}

function createClientDetailView(client: ClientDetail): ClientDetailView {
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
    timelineCount: `${client.timeline.length} events`,
  }
}

export { createClientDetailView }
export type {
  ClientDetailHeaderView,
  ClientDetailView,
  ClientMemoryView,
  ClientTimelineEventView,
}
