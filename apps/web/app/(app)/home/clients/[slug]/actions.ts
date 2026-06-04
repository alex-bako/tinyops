"use server"

import { revalidatePath } from "next/cache"

import type {
  ClientNoteActionResult,
  CreatedClientNote,
} from "@/features/clients/application/client-notes"
import type {
  ClientPropertyActionResult,
  ClientPropertyInput,
  CreatedClientProperty,
} from "@/features/clients/application/client-properties"
import {
  createClientNotesServerContext,
  createClientPropertiesServerContext,
} from "@/features/clients/loaders"

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

export async function createPropertyAction(
  input: { clientId: string } & ClientPropertyInput
): Promise<ClientPropertyActionResult<CreatedClientProperty>> {
  const context = await createClientPropertiesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.createProperty(input)
  if (result.data) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}

export async function updatePropertyAction(
  input: { id: string } & ClientPropertyInput
): Promise<ClientPropertyActionResult<undefined>> {
  const context = await createClientPropertiesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.updateProperty(input)
  if (!result.error) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}

export async function deletePropertyAction(input: {
  id: string
}): Promise<ClientPropertyActionResult<undefined>> {
  const context = await createClientPropertiesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.deleteProperty(input)
  if (!result.error) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}

export async function reorderPropertiesAction(input: {
  clientId: string
  orderedIds: string[]
}): Promise<ClientPropertyActionResult<undefined>> {
  const context = await createClientPropertiesServerContext()
  if (!context) return { error: "not_authenticated" }

  const result = await context.application.reorderProperties(input)
  if (!result.error) revalidatePath(CLIENT_DETAIL_PATH, "page")
  return result
}
