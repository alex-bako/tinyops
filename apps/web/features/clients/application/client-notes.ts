import { canManageNotes } from "@/features/clients/application/notes-policy"
import {
  createTextTimelineEventBody,
  type TimelineEventBody,
} from "@/features/clients/domain/timeline-event-body"
import type { WorkspaceRole } from "@/features/workspaces/types"

export type ClientNoteWorkspace = {
  id: string
  role: WorkspaceRole
}

export type CreatedClientNote = {
  id: string
  occurredAt: string
}

export type ClientNoteWriterPort = {
  create(input: {
    workspaceId: string
    clientId: string
    body: TimelineEventBody
    /** When set, the note is pinned to this timeline event. */
    parentEventId?: string
  }): Promise<CreatedClientNote>
  update(input: {
    workspaceId: string
    id: string
    body: TimelineEventBody
  }): Promise<void>
  delete(input: { workspaceId: string; id: string }): Promise<void>
}

export type ClientNoteActionError =
  | "not_authenticated"
  | "note_manage_forbidden"
  | "empty_note"
  | "note_not_found"
  | "note_action_failed"

export type ClientNoteActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: ClientNoteActionError }

export type ClientNotesCommandApplication = ReturnType<
  typeof createClientNotesCommandApplication
>

export function createClientNotesCommandApplication({
  workspace,
  writer,
}: {
  workspace: ClientNoteWorkspace
  writer: ClientNoteWriterPort
}) {
  async function runManaged<T>(
    operation: () => Promise<T>
  ): Promise<ClientNoteActionResult<T>> {
    if (!canManageNotes(workspace.role)) {
      return { error: "note_manage_forbidden" }
    }

    try {
      return { data: await operation() }
    } catch (error) {
      return { error: mapClientNoteActionError(error) }
    }
  }

  return {
    async createNote(
      input: { clientId: string; text: string; parentEventId?: string }
    ): Promise<ClientNoteActionResult<CreatedClientNote>> {
      return runManaged(() => {
        const body = requireNoteBody(input.text)
        return writer.create({
          workspaceId: workspace.id,
          clientId: input.clientId,
          body,
          parentEventId: input.parentEventId,
        })
      })
    },

    async updateNote(
      input: { id: string; text: string }
    ): Promise<ClientNoteActionResult<undefined>> {
      return runManaged(async () => {
        const body = requireNoteBody(input.text)
        await writer.update({ workspaceId: workspace.id, id: input.id, body })
        return undefined
      })
    },

    async deleteNote(
      input: { id: string }
    ): Promise<ClientNoteActionResult<undefined>> {
      return runManaged(async () => {
        await writer.delete({ workspaceId: workspace.id, id: input.id })
        return undefined
      })
    },
  }
}

function requireNoteBody(text: string): TimelineEventBody {
  const body = createTextTimelineEventBody(text)
  if (body.blocks.length === 0) throw new Error("empty_note")
  return body
}

function mapClientNoteActionError(error: unknown): ClientNoteActionError {
  if (error instanceof Error && isClientNoteActionError(error.message)) {
    return error.message
  }
  return "note_action_failed"
}

function isClientNoteActionError(value: string): value is ClientNoteActionError {
  return (
    value === "empty_note" ||
    value === "note_not_found" ||
    value === "note_action_failed"
  )
}
