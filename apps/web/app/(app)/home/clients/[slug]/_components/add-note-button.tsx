"use client"

import { PlusIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { useNotesComposer } from "./notes-focus-context"

export function AddNoteButton() {
  const { focusComposer } = useNotesComposer()
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => focusComposer()}
    >
      <PlusIcon />
      Add note
    </Button>
  )
}
