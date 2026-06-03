"use client"

import * as React from "react"

import type { ClientNoteView } from "../_view-model"
import { EventNoteComposer } from "./note-composer"
import { NoteListItem } from "./note-list-item"
import { useNoteCollection } from "./use-note-collection"

/**
 * The note thread shown under a single timeline event when "Notes on events"
 * is on. Reuses the shared optimistic note collection, scoped to this event via
 * its parentEventId.
 */
export function EventNotes({
  clientId,
  eventId,
  notes,
  canManage,
  currentUserName,
}: {
  clientId: string
  eventId: string
  notes: ClientNoteView[]
  canManage: boolean
  currentUserName: string | null
}) {
  const collection = useNoteCollection({
    clientId,
    parentEventId: eventId,
    initialNotes: notes,
    currentUserName,
  })

  return (
    <div className="mt-3 flex flex-col gap-2">
      {collection.displayNotes.length > 0 ? (
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {collection.displayNotes.map((note) => (
            <NoteListItem
              key={note.id}
              note={note}
              canManage={canManage}
              compact
              onEdit={collection.edit}
              onDelete={collection.remove}
              onRetry={collection.retry}
              onDiscard={collection.discard}
            />
          ))}
        </ul>
      ) : null}
      {canManage ? <EventNoteComposer onSubmit={collection.create} /> : null}
    </div>
  )
}
