"use client"

import * as React from "react"
import { PencilIcon, Trash2Icon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { cn } from "@workspace/ui/lib/utils"

import { formatRelativeTime } from "@/features/clients/domain/relative-time"

import { NoteEditor } from "./note-editor"

export type NoteItemStatus = "saved" | "saving" | "failed"

export type DisplayNote = {
  id: string
  text: string
  /** Absolute SSR-safe label; upgraded to a relative label client-side. */
  dateLabel: string
  /** ISO timestamp driving the relative label; null while still saving. */
  occurredAt: string | null
  authorName: string | null
  status: NoteItemStatus
  /** Only persisted notes (with a real server id) can be edited/deleted. */
  editable: boolean
}

const FALLBACK_AUTHOR = "Unknown"

type NoteListItemProps = {
  note: DisplayNote
  canManage: boolean
  onEdit: (id: string, text: string) => void
  onDelete: (id: string) => void
  onRetry: (id: string) => void
  onDiscard: (id: string) => void
  compact?: boolean
}

export function NoteListItem({
  note,
  canManage,
  onEdit,
  onDelete,
  onRetry,
  onDiscard,
  compact = false,
}: NoteListItemProps) {
  const [mode, setMode] = React.useState<"view" | "edit" | "confirm">("view")
  const [draft, setDraft] = React.useState(note.text)
  const avatarSize = compact ? "xs" : "sm"
  const authorName = note.authorName ?? FALLBACK_AUTHOR

  React.useEffect(() => {
    if (mode === "view") setDraft(note.text)
  }, [note.text, mode])

  const rowClass = cn(
    "group relative flex gap-2.5",
    compact
      ? "rounded-sm border border-border bg-muted/40 px-3 py-2.5"
      : "border-b border-border py-3.5 first:pt-1 last:border-b-0"
  )

  // ---- inline delete confirmation -----------------------------------------
  if (mode === "confirm") {
    return (
      <li
        className={cn(
          "flex items-center gap-2.5 rounded-sm bg-coral-500/[0.08] px-3 py-2.5",
          compact && "border border-coral-300"
        )}
      >
        <Trash2Icon className="size-3.5 shrink-0 text-coral-700" />
        <span className="text-[13px] text-foreground">
          Delete this note? This can’t be undone.
        </span>
        <span className="ml-auto flex items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="tertiary"
            onClick={() => setMode("view")}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            className="bg-coral-500 text-white hover:bg-coral-700"
            onClick={() => onDelete(note.id)}
          >
            <Trash2Icon />
            Delete note
          </Button>
        </span>
      </li>
    )
  }

  // ---- inline edit ---------------------------------------------------------
  if (mode === "edit") {
    const unchanged = !draft.trim() || draft.trim() === note.text
    function save() {
      const text = draft.trim()
      if (text && text !== note.text) onEdit(note.id, text)
      setMode("view")
    }
    function cancel() {
      setDraft(note.text)
      setMode("view")
    }
    return (
      <li className={rowClass}>
        <TonalAvatar name={authorName} size={avatarSize} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          <NoteMeta authorName={authorName} note={note} />
          <NoteEditor
            value={draft}
            onValueChange={setDraft}
            autoFocus
            aria-label="Edit note"
            onSubmit={save}
            onCancel={cancel}
            className="mt-1.5"
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="mr-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
              <Kbd>⌘</Kbd>
              <Kbd>↵</Kbd> save · <Kbd>esc</Kbd> cancel
            </span>
            <Button type="button" size="sm" variant="tertiary" onClick={cancel}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="primary"
              onClick={save}
              disabled={unchanged}
            >
              Save changes
            </Button>
          </div>
        </div>
      </li>
    )
  }

  // ---- resting state, hover/focus reveals edit + delete --------------------
  const showActions = canManage && note.status === "saved" && note.editable
  const failed = note.status === "failed"

  return (
    <li className={rowClass}>
      <TonalAvatar name={authorName} size={avatarSize} className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <NoteMeta authorName={authorName} note={note} />
        <p className="m-0 mt-1 max-w-[64ch] whitespace-pre-wrap break-words text-[13.5px] leading-[1.55] text-foreground">
          {note.text}
        </p>
        {canManage && failed ? (
          <div className="mt-1.5 flex items-center gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onRetry(note.id)}
            >
              Retry
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onDiscard(note.id)}
            >
              Discard
            </Button>
          </div>
        ) : null}
      </div>
      {showActions ? (
        <span className="absolute right-0 top-3 flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Edit note"
            onClick={() => setMode("edit")}
          >
            <PencilIcon />
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            aria-label="Delete note"
            onClick={() => setMode("confirm")}
          >
            <Trash2Icon />
          </Button>
        </span>
      ) : null}
    </li>
  )
}

function NoteMeta({
  authorName,
  note,
}: {
  authorName: string
  note: DisplayNote
}) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-[13px] font-medium tracking-[-0.005em] text-foreground">
        {authorName}
      </span>
      <span
        className={cn(
          "text-[11.5px] tabular-nums",
          note.status === "failed"
            ? "text-coral-700"
            : "text-muted-foreground/80"
        )}
      >
        {note.status === "saving"
          ? "Saving…"
          : note.status === "failed"
            ? "Couldn’t save"
            : <NoteWhen iso={note.occurredAt} fallback={note.dateLabel} />}
      </span>
    </div>
  )
}

/**
 * Renders an absolute label on the server, then upgrades to a relative one
 * after mount so the two renders never disagree (no hydration mismatch).
 */
function NoteWhen({ iso, fallback }: { iso: string | null; fallback: string }) {
  const [label, setLabel] = React.useState(fallback)
  React.useEffect(() => {
    if (iso) setLabel(formatRelativeTime(iso, new Date()))
  }, [iso])
  return <>{label}</>
}
