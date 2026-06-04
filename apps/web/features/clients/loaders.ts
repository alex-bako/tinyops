import {
  createClientNotesCommandApplication,
  type ClientNotesCommandApplication,
} from "@/features/clients/application/client-notes"
import {
  createClientPropertiesCommandApplication,
  type ClientPropertiesCommandApplication,
} from "@/features/clients/application/client-properties"
import { createClientQueryApplication } from "@/features/clients/application/client-query"
import { createSupabaseClientNoteWriter } from "@/features/clients/adapters/supabase-note-writer"
import { createSupabaseClientPropertyWriter } from "@/features/clients/adapters/supabase-property-writer"
import { createSupabaseClientReader } from "@/features/clients/adapters/supabase-client-reader"
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

export type ClientQueryServerContext = {
  application: ReturnType<typeof createClientQueryApplication>
}

export async function createClientQueryServerContext(): Promise<ClientQueryServerContext | null> {
  const context = await createWorkspaceRequestContext()
  if (!context) return null

  return {
    application: createClientQueryApplication({
      workspaceId: context.activeWorkspace.id,
      reader: createSupabaseClientReader({ client: context.supabase }),
    }),
  }
}
