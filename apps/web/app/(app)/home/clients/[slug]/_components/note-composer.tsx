"use client"

import * as React from "react"
import { LockIcon, PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Kbd } from "@workspace/ui/components/kbd"

import { NoteEditor } from "./note-editor"
import { NoteSlashMenu } from "./note-slash-menu"
import { useNotesComposer } from "./notes-focus-context"

// Dashed "add a note" affordance instead of a filled field, per the design.
const DASHED_CLASS =
  "rounded-sm border-dashed border-[var(--rule-strong)] bg-transparent px-3.5 py-3 focus-visible:border-[var(--rule-strong)] focus-visible:ring-0"

/**
 * Block composer for the client-level Notes section: always open, slash menu,
 * and registers with the page so the header "Add note" button and global "/"
 * hotkey can focus/open it.
 */
export function NoteComposer({ onSubmit }: { onSubmit: (text: string) => void }) {
  const { register } = useNotesComposer()
  const [draft, setDraft] = React.useState("")
  const [slashOpen, setSlashOpen] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    register({
      focus: () => {
        textareaRef.current?.focus()
        safeScrollIntoView(textareaRef.current)
      },
      openSlashMenu: () => {
        textareaRef.current?.focus()
        safeScrollIntoView(textareaRef.current)
        setSlashOpen(true)
      },
    })
    return () => register(null)
  }, [register])

  function submit() {
    const text = draft.trim()
    if (!text) return
    onSubmit(text)
    setDraft("")
    setSlashOpen(false)
  }

  const hasDraft = draft.trim().length > 0

  return (
    <div className="relative">
      <NoteEditor
        ref={textareaRef}
        value={draft}
        onValueChange={setDraft}
        onSubmit={submit}
        onSlash={() => setSlashOpen(true)}
        onCancel={() => {
          setSlashOpen(false)
          setDraft("")
          textareaRef.current?.blur()
        }}
        placeholder="Type / to add a note, link a source, or paste a file…"
        aria-label="Add a note"
        className={DASHED_CLASS}
      />
      <NoteSlashMenu
        open={slashOpen}
        onSelectNote={() => {
          setSlashOpen(false)
          textareaRef.current?.focus()
        }}
        onClose={() => setSlashOpen(false)}
      />
      <ComposerFoot
        show={hasDraft}
        onSave={submit}
        hint={
          <>
            <LockIcon className="size-3" /> Private to your workspace
          </>
        }
      />
    </div>
  )
}

/**
 * Compact composer for a single timeline event: a collapsed "Add note" trigger
 * that expands into an inline editor. No slash menu, no global registration.
 */
export function EventNoteComposer({
  onSubmit,
}: {
  onSubmit: (text: string) => void
}) {
  const [open, setOpen] = React.useState(false)
  const [draft, setDraft] = React.useState("")
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  React.useEffect(() => {
    if (open) textareaRef.current?.focus()
  }, [open])

  function submit() {
    const text = draft.trim()
    if (!text) return
    onSubmit(text)
    setDraft("")
    setOpen(false)
  }

  function close() {
    setDraft("")
    setOpen(false)
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-sm border border-dashed border-[var(--rule-strong)] px-2.5 py-1.5 text-[12px] text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted hover:text-foreground"
      >
        <PlusIcon className="size-3" /> Add note to this event
      </button>
    )
  }

  return (
    <div className="relative">
      <NoteEditor
        ref={textareaRef}
        value={draft}
        onValueChange={setDraft}
        onSubmit={submit}
        onCancel={close}
        placeholder="Add a note to this event…"
        aria-label="Add a note to this event"
      />
      <div className="mt-1.5 flex items-center gap-2">
        <span className="mr-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
          <LockIcon className="size-3" /> Pinned to this event · <Kbd>⌘</Kbd>
          <Kbd>↵</Kbd> to save
        </span>
        <Button type="button" size="sm" variant="tertiary" onClick={close}>
          Cancel
        </Button>
        <Button type="button" size="sm" variant="primary" onClick={submit}>
          Save note
        </Button>
      </div>
    </div>
  )
}

function ComposerFoot({
  show,
  onSave,
  hint,
}: {
  show: boolean
  onSave: () => void
  hint: React.ReactNode
}) {
  if (!show) return null
  return (
    <div className="mt-1.5 flex items-center gap-2">
      <span className="mr-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
        {hint}
      </span>
      <span className="inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
        <Kbd>⌘</Kbd>
        <Kbd>↵</Kbd> to save
      </span>
      <Button type="button" size="sm" variant="primary" onClick={onSave}>
        Save note
      </Button>
    </div>
  )
}

// Cosmetic-only scroll; jsdom (tests) throws on scrollIntoView, so guard it.
function safeScrollIntoView(element: HTMLElement | null) {
  try {
    element?.scrollIntoView({ block: "center", behavior: "smooth" })
  } catch {
    // Non-critical: focusing the field already brings it into view in browsers.
  }
}
