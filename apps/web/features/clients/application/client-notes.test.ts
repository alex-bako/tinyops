import { describe, expect, it, vi } from "vitest"

import {
  createClientNotesCommandApplication,
  type ClientNoteWriterPort,
} from "@/features/clients/application/client-notes"
import type { WorkspaceRole } from "@/features/workspaces/types"

function createWriter(
  overrides: Partial<ClientNoteWriterPort> = {}
): ClientNoteWriterPort {
  return {
    create: vi.fn(async () => ({ id: "note_1", occurredAt: "2026-06-03T00:00:00.000Z" })),
    update: vi.fn(async () => {}),
    delete: vi.fn(async () => {}),
    ...overrides,
  }
}

function appWith(role: WorkspaceRole, writer = createWriter()) {
  return {
    writer,
    app: createClientNotesCommandApplication({
      workspace: { id: "workspace_1", role },
      writer,
    }),
  }
}

describe("client notes command application", () => {
  it("creates a note as the active workspace and returns the persisted id", async () => {
    const { app, writer } = appWith("owner")

    const result = await app.createNote({
      clientId: "client_1",
      text: "  Called to confirm Tuesday.  ",
    })

    expect(result).toEqual({
      data: { id: "note_1", occurredAt: "2026-06-03T00:00:00.000Z" },
    })
    expect(writer.create).toHaveBeenCalledWith({
      workspaceId: "workspace_1",
      clientId: "client_1",
      body: {
        text: "Called to confirm Tuesday.",
        blocks: [{ kind: "text", text: "Called to confirm Tuesday." }],
      },
    })
  })

  it("passes parentEventId through to the writer for per-event notes", async () => {
    const { app, writer } = appWith("owner")

    await app.createNote({
      clientId: "client_1",
      text: "Pinned to the email.",
      parentEventId: "event_42",
    })

    expect(writer.create).toHaveBeenCalledWith(
      expect.objectContaining({ parentEventId: "event_42" })
    )
  })

  it("rejects callers who cannot manage notes before touching the writer", async () => {
    for (const role of ["operator", "reviewer", "viewer"] as const) {
      const { app, writer } = appWith(role)

      expect(await app.createNote({ clientId: "c", text: "hi" })).toEqual({
        error: "note_manage_forbidden",
      })
      expect(await app.updateNote({ id: "n", text: "hi" })).toEqual({
        error: "note_manage_forbidden",
      })
      expect(await app.deleteNote({ id: "n" })).toEqual({
        error: "note_manage_forbidden",
      })
      expect(writer.create).not.toHaveBeenCalled()
      expect(writer.update).not.toHaveBeenCalled()
      expect(writer.delete).not.toHaveBeenCalled()
    }
  })

  it("rejects empty note text", async () => {
    const { app, writer } = appWith("admin")

    expect(await app.createNote({ clientId: "c", text: "   " })).toEqual({
      error: "empty_note",
    })
    expect(await app.updateNote({ id: "n", text: "" })).toEqual({
      error: "empty_note",
    })
    expect(writer.create).not.toHaveBeenCalled()
    expect(writer.update).not.toHaveBeenCalled()
  })

  it("maps a missing-row writer failure to note_not_found", async () => {
    const { app } = appWith("owner", {
      ...createWriter(),
      update: vi.fn(async () => {
        throw new Error("note_not_found")
      }),
    })

    expect(await app.updateNote({ id: "missing", text: "hi" })).toEqual({
      error: "note_not_found",
    })
  })

  it("maps unknown writer failures to note_action_failed", async () => {
    const { app } = appWith("owner", {
      ...createWriter(),
      delete: vi.fn(async () => {
        throw new Error("connection reset")
      }),
    })

    expect(await app.deleteNote({ id: "n" })).toEqual({
      error: "note_action_failed",
    })
  })
})
