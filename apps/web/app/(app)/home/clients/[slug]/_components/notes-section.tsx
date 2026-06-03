"use client"

import * as React from "react"

import { Section, SectionHead } from "@workspace/ui/components/section"

import type { ClientNoteView } from "../_view-model"
import { NoteComposer } from "./note-composer"
import { NoteListItem } from "./note-list-item"
import { useNotesComposer } from "./notes-focus-context"
import { useNoteCollection } from "./use-note-collection"

export function NotesSurface({
  clientId,
  initialNotes,
  canManage,
  currentUserName = null,
}: {
  clientId: string
  initialNotes: ClientNoteView[]
  canManage: boolean
  currentUserName?: string | null
}) {
  const collection = useNoteCollection({
    clientId,
    initialNotes,
    currentUserName,
  })

  const { displayNotes } = collection

  return (
    <Section divider>
      <SectionHead
        title="Notes"
        count={`${displayNotes.length} ${displayNotes.length === 1 ? "note" : "notes"}`}
      />
      {canManage ? <GlobalNoteHotkey /> : null}
      <div className="space-y-2.5">
        {canManage ? <NoteComposer onSubmit={collection.create} /> : null}
        {displayNotes.length > 0 ? (
          <ul className="m-0 flex list-none flex-col p-0">
            {displayNotes.map((note) => (
              <NoteListItem
                key={note.id}
                note={note}
                canManage={canManage}
                onEdit={collection.edit}
                onDelete={collection.remove}
                onRetry={collection.retry}
                onDiscard={collection.discard}
              />
            ))}
          </ul>
        ) : !canManage ? (
          <p className="m-0 text-[13.5px] text-muted-foreground">No notes yet.</p>
        ) : null}
      </div>
    </Section>
  )
}

function GlobalNoteHotkey() {
  const { openSlashMenu } = useNotesComposer()

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "/") return
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (event.defaultPrevented) return
      if (isEditableTarget(event.target)) return
      event.preventDefault()
      openSlashMenu()
    }
    document.addEventListener("keydown", onKeyDown)
    return () => document.removeEventListener("keydown", onKeyDown)
  }, [openSlashMenu])

  return null
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  )
}
