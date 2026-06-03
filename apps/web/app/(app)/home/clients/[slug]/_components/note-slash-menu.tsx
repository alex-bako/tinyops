"use client"

import * as React from "react"
import { FileTextIcon, LinkIcon, PaperclipIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

type SlashAction = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  hint?: string
  disabled?: boolean
  onSelect?: () => void
}

/**
 * Slash-command shell. Only "Note" is wired today; source-linking and file
 * attachments are advertised as coming soon.
 */
export function NoteSlashMenu({
  open,
  onSelectNote,
  onClose,
}: {
  open: boolean
  onSelectNote: () => void
  onClose: () => void
}) {
  const menuRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener("pointerdown", onPointerDown)
    return () => document.removeEventListener("pointerdown", onPointerDown)
  }, [open, onClose])

  if (!open) return null

  const actions: SlashAction[] = [
    { icon: FileTextIcon, label: "Note", onSelect: onSelectNote },
    { icon: LinkIcon, label: "Link a source", hint: "Soon", disabled: true },
    { icon: PaperclipIcon, label: "Attach file", hint: "Soon", disabled: true },
  ]

  return (
    <div
      ref={menuRef}
      role="menu"
      aria-label="Insert"
      className="absolute left-0 top-full z-20 mt-1 w-60 overflow-hidden rounded-md border border-border bg-popover p-1 shadow-[var(--shadow-2)]"
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          role="menuitem"
          disabled={action.disabled}
          onClick={action.onSelect}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-[13px] text-foreground transition-colors",
            action.disabled
              ? "cursor-default text-muted-foreground/70"
              : "hover:bg-muted"
          )}
        >
          <action.icon className="size-3.5 text-muted-foreground" />
          <span className="flex-1">{action.label}</span>
          {action.hint ? (
            <span className="font-mono text-[10.5px] uppercase tracking-[0.04em] text-muted-foreground/60">
              {action.hint}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  )
}
