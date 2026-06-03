"use client"

import * as React from "react"

import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

type NoteEditorProps = {
  value: string
  onValueChange: (value: string) => void
  onSubmit: () => void
  onCancel?: () => void
  onSlash?: () => void
  placeholder?: string
  disabled?: boolean
  autoFocus?: boolean
  "aria-label"?: string
  className?: string
}

/**
 * Plain-text note editor: ⌘/Ctrl+Enter saves, Enter inserts a newline, Escape
 * cancels, and "/" at the start of an empty draft opens the slash menu.
 */
export const NoteEditor = React.forwardRef<HTMLTextAreaElement, NoteEditorProps>(
  function NoteEditor(
    {
      value,
      onValueChange,
      onSubmit,
      onCancel,
      onSlash,
      placeholder,
      disabled,
      autoFocus,
      "aria-label": ariaLabel,
      className,
    },
    ref
  ) {
    function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault()
        onSubmit()
        return
      }
      if (event.key === "Escape") {
        event.preventDefault()
        onCancel?.()
        return
      }
      if (event.key === "/" && onSlash && value.length === 0) {
        event.preventDefault()
        onSlash()
      }
    }

    return (
      <Textarea
        ref={ref}
        value={value}
        autoFocus={autoFocus}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        className={cn("min-h-[44px] text-[13.5px] leading-[1.55]", className)}
      />
    )
  }
)
