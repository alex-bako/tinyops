"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import type { ClientNoteView } from "../_view-model"
import { createNoteAction, deleteNoteAction, updateNoteAction } from "../actions"
import type { DisplayNote } from "./note-list-item"

type CreatedNote = {
  tempId: string
  serverId: string | null
  text: string
  pending: boolean
  failed: boolean
}

export type NoteCollection = {
  displayNotes: DisplayNote[]
  create: (text: string) => void
  edit: (id: string, text: string) => void
  remove: (id: string) => void
  retry: (tempId: string) => void
  discard: (tempId: string) => void
}

/**
 * Optimistic CRUD for a collection of notes — shared by the client-level Notes
 * section and the per-event note threads. Create/edit/delete apply locally
 * first, then reconcile against the server truth delivered by `initialNotes`
 * after a refresh. Delete is immediate (the inline confirmation lives in the
 * note row), so there is no undo window to flush on unmount.
 */
export function useNoteCollection({
  clientId,
  parentEventId,
  initialNotes,
  currentUserName,
}: {
  clientId: string
  parentEventId?: string
  initialNotes: ClientNoteView[]
  currentUserName: string | null
}): NoteCollection {
  const { refresh } = useRouter()

  const [created, setCreated] = React.useState<CreatedNote[]>([])
  const [edits, setEdits] = React.useState<Record<string, string>>({})
  const [deleted, setDeleted] = React.useState<ReadonlySet<string>>(
    () => new Set()
  )

  // Reconcile optimistic overlays once the server refresh delivers the truth.
  React.useEffect(() => {
    setCreated((prev) =>
      prev.filter(
        (note) =>
          !(note.serverId && initialNotes.some((n) => n.id === note.serverId))
      )
    )
    setEdits((prev) => {
      const next = { ...prev }
      for (const note of initialNotes) {
        if (next[note.id] === note.text) delete next[note.id]
      }
      return next
    })
    setDeleted((prev) => {
      const next = new Set(prev)
      for (const id of prev) {
        if (!initialNotes.some((n) => n.id === id)) next.delete(id)
      }
      return next.size === prev.size ? prev : next
    })
  }, [initialNotes])

  // Lets the failure toast's "Retry" re-invoke the latest runCreate without the
  // callback referencing itself before declaration.
  const runCreateRef = React.useRef<(text: string, tempId: string) => void>(
    () => {}
  )

  const runCreate = React.useCallback(
    (text: string, tempId: string) => {
      setCreated((prev) =>
        prev.map((note) =>
          note.tempId === tempId
            ? { ...note, pending: true, failed: false }
            : note
        )
      )
      void (async () => {
        const result = await createNoteAction({
          clientId,
          text,
          ...(parentEventId ? { parentEventId } : {}),
        })
        if (result.error || !result.data) {
          setCreated((prev) =>
            prev.map((note) =>
              note.tempId === tempId
                ? { ...note, pending: false, failed: true }
                : note
            )
          )
          toast.error("Couldn’t save note", {
            action: {
              label: "Retry",
              onClick: () => runCreateRef.current(text, tempId),
            },
          })
          return
        }
        const serverId = result.data.id
        setCreated((prev) =>
          prev.map((note) =>
            note.tempId === tempId
              ? { ...note, serverId, pending: false, failed: false }
              : note
          )
        )
        refresh()
      })()
    },
    [clientId, parentEventId, refresh]
  )
  React.useEffect(() => {
    runCreateRef.current = runCreate
  }, [runCreate])

  const create = React.useCallback(
    (text: string) => {
      const tempId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `temp-${Date.now()}`
      setCreated((prev) => [
        { tempId, serverId: null, text, pending: true, failed: false },
        ...prev,
      ])
      runCreate(text, tempId)
    },
    [runCreate]
  )

  const discard = React.useCallback((tempId: string) => {
    setCreated((prev) => prev.filter((note) => note.tempId !== tempId))
  }, [])

  const retry = React.useCallback(
    (tempId: string) => {
      const target = created.find((note) => note.tempId === tempId)
      if (target) runCreate(target.text, tempId)
    },
    [created, runCreate]
  )

  const edit = React.useCallback(
    (id: string, text: string) => {
      setEdits((prev) => ({ ...prev, [id]: text }))
      void (async () => {
        const result = await updateNoteAction({ id, text })
        if (result.error) {
          setEdits((prev) => {
            const next = { ...prev }
            delete next[id]
            return next
          })
          toast.error("Couldn’t update note")
          return
        }
        refresh()
      })()
    },
    [refresh]
  )

  const remove = React.useCallback(
    (id: string) => {
      setDeleted((prev) => new Set(prev).add(id))
      void (async () => {
        const result = await deleteNoteAction({ id })
        if (result.error) {
          setDeleted((prev) => {
            const next = new Set(prev)
            next.delete(id)
            return next
          })
          toast.error("Couldn’t delete note")
          return
        }
        refresh()
      })()
    },
    [refresh]
  )

  const displayNotes = React.useMemo<DisplayNote[]>(() => {
    const pendingCreates: DisplayNote[] = created
      .filter(
        (note) =>
          !(note.serverId && initialNotes.some((n) => n.id === note.serverId))
      )
      .map((note) => ({
        id: note.tempId,
        text: note.text,
        dateLabel: "Just now",
        occurredAt: null,
        authorName: currentUserName,
        status: note.failed ? "failed" : note.pending ? "saving" : "saved",
        editable: false,
      }))

    const base: DisplayNote[] = initialNotes
      .filter((note) => !deleted.has(note.id))
      .map((note) => ({
        id: note.id,
        text: edits[note.id] ?? note.text,
        dateLabel: note.dateLabel,
        occurredAt: note.occurredAt,
        authorName: note.author?.name ?? null,
        status: "saved",
        editable: true,
      }))

    return [...pendingCreates, ...base]
  }, [created, initialNotes, deleted, edits, currentUserName])

  return { displayNotes, create, edit, remove, retry, discard }
}
