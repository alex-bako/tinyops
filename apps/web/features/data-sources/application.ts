import { canManageSources } from "@/features/data-sources/policy"
import type {
  ImapConnectionSettingsCommand,
  ImapConnectCommandDraft,
  ImapIntakeSettingsCommand,
} from "@/features/data-sources/imap"
import {
  createDataSourceCommandRegistry,
  type DataSourceCommandRegistry,
  type GoogleFormsManualCsvConnectCommand,
  type ImapCredentialReader,
} from "@/features/data-sources/command-registry"
import type {
  DataSourceCommandStore,
  DataSourceReader,
  DataSourceWorkspace,
  ImapConnectionTester,
} from "@/features/data-sources/types"
import type {
  Result,
  SyncFailure,
} from "@/features/data-sources/domain/sync"

export type {
  Result,
  SyncFailure,
  SyncFailureCode,
} from "@/features/data-sources/domain/sync"
export {
  isSyncFailureCode,
  safeSyncFailureCauseMessage,
  serializeSyncFailure,
  syncFailureMessage,
} from "@/features/data-sources/domain/sync"

export type DataSourceActionError =
  | "invalid_imap_config"
  | "invalid_google_form_id"
  | "invalid_google_forms_csv"
  | "invalid_google_forms_csv_mapping"
  | "invalid_google_forms_csv_row"
  | "imap_connection_failed"
  | "source_manage_forbidden"
  | "source_not_found"
  | "source_action_failed"

export type DataSourceActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: DataSourceActionError }

export type RequestAllDataSourceSyncsResult = {
  queued: number
}

export type ImapConnectCommand = ImapConnectCommandDraft
export type ImapImportSettingsCommand = ImapIntakeSettingsCommand
export type { GoogleFormsManualCsvConnectCommand }

export type {
  ImapConnectionSettingsCommand,
  ImapIntakeSettingsCommand,
}

export type { ImapCredentialReader }

export type ImapSyncCredentialReader = {
  readImapPasswordForSync(input: {
    workspaceId: string
    sourceId: string
  }): Promise<Result<string, SyncFailure>>
}

export type ImapSecretReader = ImapCredentialReader & ImapSyncCredentialReader

export function createDataSourceQueryApplication({
  workspace,
  reader,
}: {
  workspace: DataSourceWorkspace
  reader: DataSourceReader
}) {
  return {
    async listDataSources() {
      return reader.listForWorkspace(workspace.id)
    },

    async findDataSource(sourceType: string) {
      if (!isReadableSingletonSourceType(sourceType)) return null
      return reader.findForWorkspace({
        workspaceId: workspace.id,
        sourceType,
      })
    },
  }
}

export function createDataSourceCommandApplication({
  workspace,
  store,
  imapConnectionTester,
  imapCredentialReader,
  commandRegistry = createDataSourceCommandRegistry({
    workspace,
    store,
    imapConnectionTester,
    imapCredentialReader,
  }),
}: {
  workspace: DataSourceWorkspace
  store: DataSourceCommandStore
  imapConnectionTester: ImapConnectionTester
  imapCredentialReader: ImapCredentialReader
  commandRegistry?: DataSourceCommandRegistry
}) {
  async function runManaged<T>(
    operation: () => Promise<T>
  ): Promise<DataSourceActionResult<T>> {
    if (!canManageSources(workspace.role)) {
      return { error: "source_manage_forbidden" }
    }

    try {
      return { data: await operation() }
    } catch (error) {
      return { error: mapDataSourceActionError(error) }
    }
  }

  return {
    ...createDataSourceQueryApplication({ workspace, reader: store }),

    async connectImap(input: ImapConnectCommand) {
      return runManaged(() => commandRegistry.imap.connect(input))
    },

    async connectGoogleFormsManualCsv(
      input: GoogleFormsManualCsvConnectCommand
    ) {
      return runManaged(() => commandRegistry.forms.connectManualCsv(input))
    },

    async updateImapConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ) {
      return runManaged(() =>
        commandRegistry.imap.updateConnectionSettings(sourceId, input)
      )
    },

    async updateImapIntakeSettings(
      sourceId: string,
      input: ImapImportSettingsCommand
    ) {
      return runManaged(() =>
        commandRegistry.imap.updateIntakeSettings(sourceId, input)
      )
    },

    async refreshImapFolders(sourceId: string) {
      return runManaged(() => commandRegistry.imap.refreshFolders(sourceId))
    },

    async disconnect(sourceId: string) {
      return runManaged(async () => {
        await commandRegistry.lifecycle.disconnect(sourceId)
        return undefined
      })
    },

    async requestSync(sourceId: string) {
      return runManaged(async () => {
        await commandRegistry.lifecycle.requestSync(sourceId)
        return undefined
      })
    },

    async requestAllConfiguredSyncs() {
      return runManaged<RequestAllDataSourceSyncsResult>(async () => {
        return commandRegistry.lifecycle.requestAllConfiguredSyncs()
      })
    },
  }
}

export const createDataSourceApplication = createDataSourceCommandApplication

function isReadableSingletonSourceType(value: string): value is "imap" {
  return value === "imap"
}

function mapDataSourceActionError(error: unknown): DataSourceActionError {
  if (!(error instanceof Error)) return "source_action_failed"
  if (isDataSourceActionError(error.message)) return error.message
  return "source_action_failed"
}

function isDataSourceActionError(value: string): value is DataSourceActionError {
  return (
    value === "invalid_imap_config" ||
    value === "invalid_google_form_id" ||
    value === "invalid_google_forms_csv" ||
    value === "invalid_google_forms_csv_mapping" ||
    value === "invalid_google_forms_csv_row" ||
    value === "imap_connection_failed" ||
    value === "source_manage_forbidden" ||
    value === "source_not_found" ||
    value === "source_action_failed"
  )
}
