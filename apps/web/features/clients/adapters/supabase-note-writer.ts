import type {
  ClientNoteWriterPort,
  CreatedClientNote,
} from "@/features/clients/application/client-notes"
import type { TimelineEventBody } from "@/features/clients/domain/timeline-event-body"

type WriteResult<T> = Promise<{
  data: T | null
  error: { message: string } | null
}>

type MutateResult = { error: { message: string } | null }

type TimelineNoteInsert = {
  workspace_id: string
  client_id: string
  event_type: "manual_note"
  event_date: string
  body: TimelineEventBody
  parent_event_id?: string
}

type NoteMutateBuilder = PromiseLike<MutateResult> & {
  eq(column: string, value: unknown): NoteMutateBuilder
}

type NoteWriterQuery = {
  insert(values: TimelineNoteInsert): {
    select(columns: string): {
      single(): WriteResult<{ id: string; event_date: string }>
    }
  }
  update(values: { body: TimelineEventBody }): NoteMutateBuilder
  delete(): NoteMutateBuilder
}

export type SupabaseClientNoteWriterClient = {
  from(table: string): unknown
}

export function createSupabaseClientNoteWriter({
  client,
}: {
  client: SupabaseClientNoteWriterClient
}): ClientNoteWriterPort {
  return {
    async create({
      workspaceId,
      clientId,
      body,
      parentEventId,
    }): Promise<CreatedClientNote> {
      const { data, error } = await timelineEvents(client)
        .insert({
          workspace_id: workspaceId,
          client_id: clientId,
          event_type: "manual_note",
          event_date: new Date().toISOString(),
          body,
          ...(parentEventId ? { parent_event_id: parentEventId } : {}),
        })
        .select("id, event_date")
        .single()

      if (error || !data) {
        throw new Error("note_action_failed", { cause: error ?? undefined })
      }
      return { id: data.id, occurredAt: data.event_date }
    },

    // Delete/update are gated to owner/admin in the application layer before
    // they reach here, so RLS always permits the write. We deliberately do NOT
    // chain .select(): under RLS a DELETE/UPDATE ... RETURNING can come back
    // empty even when the row was changed, which would look like a false miss.
    // A null error means the write executed.
    async update({ workspaceId, id, body }) {
      const { error } = await timelineEvents(client)
        .update({ body })
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .eq("event_type", "manual_note")

      if (error) throw new Error("note_action_failed", { cause: error })
    },

    async delete({ workspaceId, id }) {
      const { error } = await timelineEvents(client)
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("id", id)
        .eq("event_type", "manual_note")

      if (error) throw new Error("note_action_failed", { cause: error })
    },
  }
}

function timelineEvents(client: SupabaseClientNoteWriterClient): NoteWriterQuery {
  return client.from("timeline_events") as NoteWriterQuery
}
