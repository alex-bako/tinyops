import type { ClientTimelineEvent } from "@/features/clients/domain/client-profile"

export type PartitionedTimeline = {
  /** Source events only (email/form/sent/csvimport) — what the timeline shows. */
  sourceEvents: ClientTimelineEvent[]
  /** Notes about the whole client (no parent) — what the Notes section shows. */
  standaloneNotes: ClientTimelineEvent[]
  /** Notes pinned to a specific event, keyed by parent id, oldest-first. */
  notesByParent: Map<string, ClientTimelineEvent[]>
}

/**
 * Splits a (newest-first) timeline into the three surfaces that render it.
 * A note attached to an event lives only under that event — never in the
 * timeline or the standalone Notes section — so each note appears exactly once.
 */
export function partitionTimeline(
  events: ClientTimelineEvent[]
): PartitionedTimeline {
  const sourceEvents: ClientTimelineEvent[] = []
  const standaloneNotes: ClientTimelineEvent[] = []
  const notesByParent = new Map<string, ClientTimelineEvent[]>()

  for (const event of events) {
    if (event.type !== "note") {
      sourceEvents.push(event)
      continue
    }
    if (event.parentEventId) {
      const existing = notesByParent.get(event.parentEventId)
      if (existing) existing.push(event)
      else notesByParent.set(event.parentEventId, [event])
    } else {
      standaloneNotes.push(event)
    }
  }

  // Input is newest-first; per-event notes read most naturally oldest-first,
  // with the "add note" composer sitting at the bottom of the thread.
  for (const [parentId, notes] of notesByParent) {
    notesByParent.set(parentId, [...notes].reverse())
  }

  return { sourceEvents, standaloneNotes, notesByParent }
}
