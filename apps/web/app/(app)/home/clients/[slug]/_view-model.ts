import {
  clientCohortBadge,
  clientDetailFlagBadges,
  clientStatusBadge,
  type ClientStateBadge,
} from "@/lib/client-state"
import { partitionTimeline } from "@/features/clients/domain/timeline-grouping"
import type {
  ClientAttribute,
  ClientDetail,
  ClientMemory,
  ClientProperty,
} from "@/features/clients/application/client-memory"
import {
  createNoteView,
  createTimelineEventViews,
  type ClientNoteView,
  type ClientTimelineEventView,
} from "@/features/clients/application/timeline-presentation"

/** Per-event notes, keyed by the timeline event they're pinned to. */
export type TimelineEventNotesMap = Record<string, ClientNoteView[]>

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
  clientId: string
  header: ClientDetailHeaderView
  memory: ClientMemoryView
  properties: ClientProperty[]
  attributes: ClientAttribute[]
  timeline: ClientTimelineEventView[]
  timelineCount: string
  notes: ClientNoteView[]
  eventNotes: TimelineEventNotesMap
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

function createClientDetailView(client: ClientDetail): ClientDetailView {
  // Notes attached to an event render only under that event; standalone notes
  // render in the Notes section; the timeline shows source events only.
  const { sourceEvents, standaloneNotes, notesByParent } = partitionTimeline(
    client.timeline
  )

  const eventNotes: TimelineEventNotesMap = {}
  for (const [eventId, notes] of notesByParent) {
    eventNotes[eventId] = notes.map(createNoteView)
  }

  return {
    clientId: client.id,
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
    attributes: client.attributes,
    timeline: createTimelineEventViews(sourceEvents),
    timelineCount: `${sourceEvents.length} events`,
    notes: standaloneNotes.map(createNoteView),
    eventNotes,
  }
}

export { createClientDetailView }
export type {
  ClientDetailHeaderView,
  ClientDetailView,
  ClientMemoryView,
  ClientTimelineEventView,
}
export type {
  ClientNoteView,
  ClientNoteAuthorView,
} from "@/features/clients/application/timeline-presentation"
