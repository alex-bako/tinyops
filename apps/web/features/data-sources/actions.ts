"use server"

import { revalidatePath } from "next/cache"

import {
  createDataSourceCommandApplication,
  type ImapConnectionSettingsCommand,
  type ImapConnectCommand,
  type ImapImportSettingsCommand,
} from "@/features/data-sources/application"
import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"
import { createSupabaseImapSecretReader } from "@/features/data-sources/imap-secret-reader"
import { createDataSourceServerContext } from "@/features/data-sources/loaders"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"

function revalidateDataSources() {
  revalidatePath(DEFAULT_SIGNED_IN_PATH, "layout")
  revalidatePath("/home/sources")
}

async function createActionApplication() {
  const context = await createDataSourceServerContext()
  if (!context) return null

  return createDataSourceCommandApplication({
    workspace: context.workspace,
    store: context.store,
    imapConnectionTester: createImapFlowConnectionTester(),
    imapCredentialReader: createSupabaseImapSecretReader(),
  })
}

export async function connectImapDataSourceAction(input: ImapConnectCommand) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.connectImap(input)
  if (result.data) revalidateDataSources()
  return result
}

export async function updateImapConnectionSettingsAction(
  sourceId: string,
  input: ImapConnectionSettingsCommand
) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.updateImapConnectionSettings(sourceId, input)
  if (result.data) revalidateDataSources()
  return result
}

export async function updateImapImportSettingsAction(
  sourceId: string,
  input: ImapImportSettingsCommand
) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.updateImapIntakeSettings(sourceId, input)
  if (result.data) revalidateDataSources()
  return result
}

export async function refreshImapFoldersAction(sourceId: string) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.refreshImapFolders(sourceId)
  if (result.data) revalidateDataSources()
  return result
}

export async function disconnectDataSourceAction(sourceId: string) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.disconnect(sourceId)
  if (result.data === undefined && !result.error) revalidateDataSources()
  return result
}

export async function requestDataSourceSyncAction(sourceId: string) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.requestSync(sourceId)
  if (result.data === undefined && !result.error) revalidateDataSources()
  return result
}
