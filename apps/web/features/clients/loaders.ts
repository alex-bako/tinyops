import {
  createClientNotesCommandApplication,
  type ClientNotesCommandApplication,
} from "@/features/clients/application/client-notes"
import {
  createClientPropertiesCommandApplication,
  type ClientPropertiesCommandApplication,
} from "@/features/clients/application/client-properties"
import { createSupabaseClientNoteWriter } from "@/features/clients/adapters/supabase-note-writer"
import { createSupabaseClientPropertyWriter } from "@/features/clients/adapters/supabase-property-writer"
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

export type ClientPropertiesServerContext = {
  application: ClientPropertiesCommandApplication
}

export async function createClientPropertiesServerContext(): Promise<ClientPropertiesServerContext | null> {
  const context = await createWorkspaceRequestContext()
  if (!context) return null

  return {
    application: createClientPropertiesCommandApplication({
      workspace: context.activeWorkspace,
      writer: createSupabaseClientPropertyWriter({ client: context.supabase }),
    }),
  }
}
