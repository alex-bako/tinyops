import {
  buildDefaultImapIntakeSettings,
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  type ImapConnectionSettingsCommand,
  type ImapConnectCommandDraft,
  type ImapIntakeSettingsCommand,
} from "@/features/data-sources/imap"
import {
  buildGoogleFormsManualCsvSourceConfig,
  buildGoogleFormsManualCsvUploadRows,
  parseGoogleFormsCsv,
} from "@/features/data-sources/google-forms"
import type {
  DataSourceCommandStore,
  DataSourceWorkspace,
  GoogleFormsDataSource,
  ImapConnectionTester,
  ImapDataSource,
} from "@/features/data-sources/types"

export type GoogleFormsManualCsvConnectCommand = {
  formUrlOrId: string
  displayName: string
  fileName: string
  identityColumn: string
  timestampColumn: string
  csvText: string
}

export type ImapCredentialReader = {
  readImapPassword(input: {
    workspaceId: string
    sourceId: string
  }): Promise<string>
}

export type DataSourceCommandRegistry = {
  imap: {
    connect(input: ImapConnectCommandDraft): Promise<ImapDataSource>
    updateConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ): Promise<ImapDataSource>
    updateIntakeSettings(
      sourceId: string,
      input: ImapIntakeSettingsCommand
    ): Promise<ImapDataSource>
    refreshFolders(sourceId: string): Promise<ImapDataSource>
  }
  forms: {
    connectManualCsv(
      input: GoogleFormsManualCsvConnectCommand
    ): Promise<GoogleFormsDataSource>
  }
  lifecycle: {
    disconnect(sourceId: string): Promise<void>
    requestSync(sourceId: string): Promise<void>
    requestAllConfiguredSyncs(): Promise<{ queued: number }>
  }
}

export function createDataSourceCommandRegistry({
  workspace,
  store,
  imapConnectionTester,
  imapCredentialReader,
}: {
  workspace: DataSourceWorkspace
  store: DataSourceCommandStore
  imapConnectionTester: ImapConnectionTester
  imapCredentialReader: ImapCredentialReader
}): DataSourceCommandRegistry {
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
    imap: {
      async connect(input) {
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
      },

      async updateConnectionSettings(sourceId, input) {
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
      },

      async updateIntakeSettings(sourceId, input) {
        await loadImapSource(sourceId)
        return store.updateImapIntake({
          workspaceId: workspace.id,
          sourceId,
          intake: buildImapIntakeSettings(input),
        })
      },

      async refreshFolders(sourceId) {
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
      },
    },
    forms: {
      async connectManualCsv(input) {
        const parsed = parseGoogleFormsCsv(input.csvText)
        const source = buildGoogleFormsManualCsvSourceConfig({
          formUrlOrId: input.formUrlOrId,
          displayName: input.displayName,
          headers: parsed.headers,
          identityColumn: input.identityColumn,
          timestampColumn: input.timestampColumn,
        })
        const rows = buildGoogleFormsManualCsvUploadRows({
          source,
          rows: parsed.rows,
        })

        return store.connectGoogleFormsManualCsv({
          workspaceId: workspace.id,
          source,
          upload: {
            fileName: input.fileName.trim() || "google-forms-responses.csv",
            rows,
          },
        })
      },
    },
    lifecycle: {
      async disconnect(sourceId) {
        await store.disconnect({ workspaceId: workspace.id, sourceId })
      },
      async requestSync(sourceId) {
        await store.requestSync({ workspaceId: workspace.id, sourceId })
      },
      async requestAllConfiguredSyncs() {
        return store.requestAllSyncs({ workspaceId: workspace.id })
      },
    },
  }
}
