import { canManageSources } from "@/features/data-sources/policy"
import {
  buildDefaultImapIntakeSettings,
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  type ImapConnectionSettingsCommand,
  type ImapConnectCommandDraft,
  type ImapIntakeSettingsCommand,
} from "@/features/data-sources/imap"
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
  | "imap_connection_failed"
  | "source_manage_forbidden"
  | "source_not_found"
  | "source_action_failed"

export type DataSourceActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: DataSourceActionError }

export type ImapConnectCommand = ImapConnectCommandDraft
export type ImapImportSettingsCommand = ImapIntakeSettingsCommand

export type {
  ImapConnectionSettingsCommand,
  ImapIntakeSettingsCommand,
}

export type ImapCredentialReader = {
  readImapPassword(input: {
    workspaceId: string
    sourceId: string
  }): Promise<string>
}

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
      if (!isSourceType(sourceType)) return null
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
}: {
  workspace: DataSourceWorkspace
  store: DataSourceCommandStore
  imapConnectionTester: ImapConnectionTester
  imapCredentialReader: ImapCredentialReader
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

  async function loadImapSource(sourceId: string) {
    const source = await store.findByIdForWorkspace({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!source || source.type !== "imap") {
      throw new Error("source_not_found")
    }
    return source
  }

  async function readStoredPassword(sourceId: string) {
    const password = await imapCredentialReader.readImapPassword({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!password.trim()) throw new Error("invalid_imap_config")
    return password
  }

  return {
    ...createDataSourceQueryApplication({ workspace, reader: store }),

    async connectImap(input: ImapConnectCommand) {
      return runManaged(async () => {
        const connection = buildImapConnectionConfig(input)
        const password = input.password.trim()
        if (!password) throw new Error("invalid_imap_config")

        const { folders } = await imapConnectionTester.test({
          ...connection,
          password,
        })
        const folderSnapshot = buildImapFolderSnapshot(folders)
        const intake = buildDefaultImapIntakeSettings({
          historyWindow: input.historyWindow,
          folderSnapshot,
        })

        return store.connectImap({
          workspaceId: workspace.id,
          connection,
          intake,
          folderSnapshot,
          password,
        })
      })
    },

    async updateImapConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ) {
      return runManaged(async () => {
        await loadImapSource(sourceId)
        const connection = buildImapConnectionConfig(input)
        const submittedPassword = input.password?.trim()
        const password = submittedPassword || (await readStoredPassword(sourceId))
        const { folders } = await imapConnectionTester.test({
          ...connection,
          password,
        })

        return store.updateImapConnection({
          workspaceId: workspace.id,
          sourceId,
          connection,
          password: submittedPassword || undefined,
          folderSnapshot: buildImapFolderSnapshot(folders),
        })
      })
    },

    async updateImapIntakeSettings(
      sourceId: string,
      input: ImapImportSettingsCommand
    ) {
      return runManaged(async () => {
        await loadImapSource(sourceId)
        return store.updateImapIntake({
          workspaceId: workspace.id,
          sourceId,
          intake: buildImapIntakeSettings(input),
        })
      })
    },

    async refreshImapFolders(sourceId: string) {
      return runManaged(async () => {
        const source = await loadImapSource(sourceId)
        const password = await readStoredPassword(sourceId)
        const { folders } = await imapConnectionTester.test({
          ...source.connection,
          password,
        })

        return store.updateImapFolderSnapshot({
          workspaceId: workspace.id,
          sourceId,
          folderSnapshot: buildImapFolderSnapshot(folders),
        })
      })
    },

    async disconnect(sourceId: string) {
      return runManaged(async () => {
        await store.disconnect({ workspaceId: workspace.id, sourceId })
        return undefined
      })
    },

    async requestSync(sourceId: string) {
      return runManaged(async () => {
        await store.requestSync({ workspaceId: workspace.id, sourceId })
        return undefined
      })
    },
  }
}

export const createDataSourceApplication = createDataSourceCommandApplication

function isSourceType(value: string): value is "imap" {
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
    value === "imap_connection_failed" ||
    value === "source_manage_forbidden" ||
    value === "source_not_found" ||
    value === "source_action_failed"
  )
}
