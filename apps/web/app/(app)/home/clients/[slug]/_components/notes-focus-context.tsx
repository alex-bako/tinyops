"use client"

import * as React from "react"

export type NotesComposerHandle = {
  focus: () => void
  openSlashMenu: () => void
}

type NotesComposerContextValue = {
  register: (handle: NotesComposerHandle | null) => void
  focusComposer: () => void
  openSlashMenu: () => void
}

const NotesComposerContext =
  React.createContext<NotesComposerContextValue | null>(null)

/**
 * Connects the page-level note entry points (the header "Add note" button and
 * the global "/" hotkey) to the single inline composer further down the page,
 * across the server/client boundary, without prop-drilling or a global bus.
 */
export function NotesComposerProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const handleRef = React.useRef<NotesComposerHandle | null>(null)

  const value = React.useMemo<NotesComposerContextValue>(
    () => ({
      register: (handle) => {
        handleRef.current = handle
      },
      focusComposer: () => handleRef.current?.focus(),
      openSlashMenu: () => handleRef.current?.openSlashMenu(),
    }),
    []
  )

  return (
    <NotesComposerContext.Provider value={value}>
      {children}
    </NotesComposerContext.Provider>
  )
}

export function useNotesComposer(): NotesComposerContextValue {
  const value = React.useContext(NotesComposerContext)
  if (!value) {
    throw new Error("useNotesComposer must be used within NotesComposerProvider")
  }
  return value
}
