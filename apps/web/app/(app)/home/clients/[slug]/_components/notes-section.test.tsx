import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { ClientNoteView } from "../_view-model"
import { NotesSurface } from "./notes-section"
import { NotesComposerProvider } from "./notes-focus-context"

const createNoteAction = vi.fn()
const updateNoteAction = vi.fn()
const deleteNoteAction = vi.fn()
const refresh = vi.fn()
const toastFn = vi.fn()
const toastError = vi.fn()

vi.mock("../actions", () => ({
  createNoteAction: (input: unknown) => createNoteAction(input),
  updateNoteAction: (input: unknown) => updateNoteAction(input),
  deleteNoteAction: (input: unknown) => deleteNoteAction(input),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("sonner", () => ({
  toast: Object.assign((...args: unknown[]) => toastFn(...args), {
    error: (...args: unknown[]) => toastError(...args),
  }),
}))

function note(overrides: Partial<ClientNoteView> = {}): ClientNoteView {
  return {
    id: "note_1",
    text: "Existing note",
    dateLabel: "Jun 1",
    occurredAt: "2026-06-01T00:00:00Z",
    parentEventId: null,
    author: { name: "Jamie Park" },
    ...overrides,
  }
}

function renderNotes(initialNotes: ClientNoteView[] = [], canManage = true) {
  return render(
    <NotesComposerProvider>
      <NotesSurface
        clientId="client_1"
        initialNotes={initialNotes}
        canManage={canManage}
        currentUserName="Jamie Park"
      />
    </NotesComposerProvider>
  )
}

function typeNote(text: string) {
  const textarea = screen.getByLabelText("Add a note")
  fireEvent.change(textarea, { target: { value: text } })
  fireEvent.keyDown(textarea, { key: "Enter", metaKey: true })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("NotesSurface", () => {
  it("optimistically renders a new note before the server responds", async () => {
    let resolveCreate: (value: { data: { id: string; occurredAt: string } }) => void
    createNoteAction.mockReturnValue(
      new Promise((resolve) => {
        resolveCreate = resolve
      })
    )

    renderNotes()
    typeNote("Called to confirm Tuesday")

    expect(screen.getByText("Called to confirm Tuesday")).toBeInTheDocument()
    expect(screen.getByText("Saving…")).toBeInTheDocument()
    // No parentEventId for client-level notes.
    expect(createNoteAction).toHaveBeenCalledWith({
      clientId: "client_1",
      text: "Called to confirm Tuesday",
    })

    resolveCreate!({ data: { id: "note_99", occurredAt: "2026-06-03T00:00:00Z" } })
    await waitFor(() => expect(refresh).toHaveBeenCalled())
  })

  it("marks a failed note and offers retry", async () => {
    createNoteAction.mockResolvedValue({ error: "note_action_failed" })

    renderNotes()
    typeNote("Network will drop")

    await waitFor(() =>
      expect(screen.getByText("Couldn’t save")).toBeInTheDocument()
    )
    expect(toastError).toHaveBeenCalled()
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument()
    expect(refresh).not.toHaveBeenCalled()
  })

  it("renders the note author", () => {
    renderNotes([note()])
    expect(screen.getAllByText("Jamie Park").length).toBeGreaterThan(0)
  })

  it("deletes a note only after an inline confirmation", async () => {
    deleteNoteAction.mockResolvedValue({ data: undefined })
    renderNotes([note()])

    // Clicking the icon arms the inline confirmation — nothing deleted yet.
    fireEvent.click(screen.getByLabelText("Delete note"))
    expect(
      screen.getByText("Delete this note? This can’t be undone.")
    ).toBeInTheDocument()
    expect(deleteNoteAction).not.toHaveBeenCalled()
    expect(toastFn).not.toHaveBeenCalled()

    // Confirming deletes immediately (no undo window).
    fireEvent.click(screen.getByRole("button", { name: /Delete note/ }))
    expect(deleteNoteAction).toHaveBeenCalledWith({ id: "note_1" })
    await waitFor(() =>
      expect(screen.queryByText("Existing note")).not.toBeInTheDocument()
    )
  })

  it("cancels an inline delete without touching the server", () => {
    renderNotes([note()])

    fireEvent.click(screen.getByLabelText("Delete note"))
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(screen.getByText("Existing note")).toBeInTheDocument()
    expect(deleteNoteAction).not.toHaveBeenCalled()
  })

  it("is read-only for members who cannot manage notes", () => {
    renderNotes([note()], false)

    expect(screen.queryByLabelText("Add a note")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Delete note")).not.toBeInTheDocument()
    expect(screen.getByText("Existing note")).toBeInTheDocument()
  })
})
