import {
  createClientNotesCommandApplication,
  type ClientNotesCommandApplication,
} from "@/features/clients/application/client-notes"
import { createSupabaseClientNoteWriter } from "@/features/clients/adapters/supabase-note-writer"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"

export type ClientNotesServerContext = {
  application: ClientNotesCommandApplication
}

export async function createClientNotesServerContext(): Promise<ClientNotesServerContext | null> {
  const context = await createWorkspaceRequestContext()
  if (!context) return null

  return {
    application: createClientNotesCommandApplication({
      workspace: context.activeWorkspace,
      writer: createSupabaseClientNoteWriter({ client: context.supabase }),
    }),
  }
}
