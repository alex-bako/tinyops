"use server"

import { revalidatePath } from "next/cache"
import { after } from "next/server"

import {
  createDataSourceCommandApplication,
  type GoogleFormsManualCsvConnectCommand,
  type GoogleFormsManualCsvUpdateCommand,
  type ImapConnectionSettingsCommand,
  type ImapConnectCommand,
  type ImapImportSettingsCommand,
} from "@/features/data-sources/application"
import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"
import { createSupabaseImapSecretReader } from "@/features/data-sources/imap-secret-reader"
import { createDataSourceServerContext } from "@/features/data-sources/loaders"
import { dispatchDataSourceSyncWorker } from "@/features/data-sources/sync-dispatcher"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"
import { getLogger } from "@/lib/logging"
import {
  getOptionalSyncWorkerSecret,
  getOptionalTinyOpsAppBaseUrl,
} from "@/lib/supabase/server-env"

function revalidateDataSources() {
  revalidatePath(DEFAULT_SIGNED_IN_PATH, "layout")
  revalidatePath("/home/sources")
}

type DataSourceActionApplication = ReturnType<
  typeof createDataSourceCommandApplication
>

type DataSourceActionApplicationError = {
  readonly error: "not_authenticated"
}

async function createActionApplication(): Promise<
  DataSourceActionApplication | DataSourceActionApplicationError
> {
  const context = await createDataSourceServerContext()
  if (!context) return { error: "not_authenticated" } as const

  return createDataSourceCommandApplication({
    workspace: context.workspace,
    store: context.store,
    imapConnectionTester: createImapFlowConnectionTester(),
    imapCredentialReader: createSupabaseImapSecretReader(),
  })
}

function isActionApplicationError(
  application: DataSourceActionApplication | DataSourceActionApplicationError
): application is DataSourceActionApplicationError {
  return "error" in application
}

export async function connectImapDataSourceAction(input: ImapConnectCommand) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.connectImap(input)
  if (result.data) {
    revalidateDataSources()
    after(scheduleDataSourceSyncDispatch)
  }
  return result
}

export async function connectGoogleFormsManualCsvDataSourceAction(
  input: GoogleFormsManualCsvConnectCommand
) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.connectGoogleFormsManualCsv(input)
  if (result.data) {
    revalidateDataSources()
    after(scheduleDataSourceSyncDispatch)
  }
  return result
}

export async function updateGoogleFormsManualCsvDataSourceAction(
  sourceId: string,
  input: GoogleFormsManualCsvUpdateCommand
) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.updateGoogleFormsManualCsv(sourceId, input)
  if (result.data) {
    revalidateDataSources()
    after(scheduleDataSourceSyncDispatch)
  }
  return result
}

export async function updateImapConnectionSettingsAction(
  sourceId: string,
  input: ImapConnectionSettingsCommand
) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.updateImapConnectionSettings(sourceId, input)
  if (result.data) revalidateDataSources()
  return result
}

export async function updateImapImportSettingsAction(
  sourceId: string,
  input: ImapImportSettingsCommand
) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.updateImapIntakeSettings(sourceId, input)
  if (result.data) revalidateDataSources()
  return result
}

export async function refreshImapFoldersAction(sourceId: string) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.refreshImapFolders(sourceId)
  if (result.data) revalidateDataSources()
  return result
}

export async function disconnectDataSourceAction(sourceId: string) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.disconnect(sourceId)
  if (result.data === undefined && !result.error) revalidateDataSources()
  return result
}

export async function requestDataSourceSyncAction(sourceId: string) {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.requestSync(sourceId)
  if (result.data === undefined && !result.error) {
    revalidateDataSources()
    after(scheduleDataSourceSyncDispatch)
  }
  return result
}

export async function requestAllDataSourceSyncsAction() {
  const application = await createActionApplication()
  if (isActionApplicationError(application)) return application

  const result = await application.requestAllConfiguredSyncs()
  if (result.data && result.data.queued > 0) {
    revalidateDataSources()
    after(scheduleDataSourceSyncDispatch)
  }
  return result
}

async function scheduleDataSourceSyncDispatch() {
  const logger = getLogger().child({ component: "data_source_actions" })
  try {
    const result = await dispatchDataSourceSyncWorker({
      baseUrl: getOptionalTinyOpsAppBaseUrl(),
      secret: getOptionalSyncWorkerSecret(),
    })
    if (result.dispatched && !result.ok) {
      logger.warn(
        { event: "data_source_sync_dispatch_failed", status: result.status },
        "data source sync dispatch failed"
      )
    }
  } catch (error) {
    logger.warn(
      {
        event: "data_source_sync_dispatch_failed",
        message: safeDispatchErrorMessage(error),
      },
      "data source sync dispatch failed"
    )
  }
}

function safeDispatchErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  if (/password|token|api[_ -]?key|decrypted_secret/i.test(message)) {
    return "Dispatch failed"
  }
  return message.slice(0, 500)
}
