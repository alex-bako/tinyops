"use server"

import { revalidatePath } from "next/cache"

import {
  createDataSourceApplication,
  type ImapConnectionSettingsCommand,
  type ImapConfigCommand,
  type ImapConnectCommand,
  type ImapImportSettingsCommand,
} from "@/features/data-sources/application"
import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"
import { createDataSourceServerContext } from "@/features/data-sources/loaders"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"

function revalidateDataSources() {
  revalidatePath(DEFAULT_SIGNED_IN_PATH, "layout")
  revalidatePath("/home/sources")
}

async function createActionApplication() {
  const context = await createDataSourceServerContext()
  if (!context) return null

  return createDataSourceApplication({
    workspace: context.workspace,
    store: context.store,
    imapConnectionTester: createImapFlowConnectionTester(),
  })
}

export async function connectImapDataSourceAction(input: ImapConnectCommand) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.connectImap(input)
  if (result.data) revalidateDataSources()
  return result
}

export async function updateImapDataSourceConfigAction(
  sourceId: string,
  input: ImapConfigCommand
) {
  const application = await createActionApplication()
  if (!application) return { error: "source_action_failed" } as const

  const result = await application.updateImapConfig(sourceId, input)
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

  const result = await application.updateImapImportSettings(sourceId, input)
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
