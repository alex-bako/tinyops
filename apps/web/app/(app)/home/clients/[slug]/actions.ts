"use server"

import { revalidatePath } from "next/cache"

import type {
  ClientNoteActionResult,
  CreatedClientNote,
} from "@/features/clients/application/client-notes"
import { createClientNotesServerContext } from "@/features/clients/loaders"

const CLIENT_DETAIL_PATH = "/home/clients/[slug]"

export async function createNoteAction(input: {
  clientId: string
  text: string
  parentEventId?: string
}): Promise<ClientNoteActionResult<CreatedClientNote>> {
  const context = await createClientNotesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.createNote(input)
  if (result.data) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}

export async function updateNoteAction(input: {
  id: string
  text: string
}): Promise<ClientNoteActionResult<undefined>> {
  const context = await createClientNotesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.updateNote(input)
  if (!result.error) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}

export async function deleteNoteAction(input: {
  id: string
}): Promise<ClientNoteActionResult<undefined>> {
  const context = await createClientNotesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.deleteNote(input)
  if (!result.error) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}
