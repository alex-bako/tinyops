import {
  buildDefaultImapIntakeSettings,
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  normalizeDataSourceDisplayName,
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
  DataSourceQueryPort,
  DataSourceWorkspace,
  GoogleFormsDataSource,
  GoogleFormsSourceCommandPort,
  ImapConnectionTester,
  ImapDataSource,
  ImapSourceCommandPort,
  SourceLifecycleCommandPort,
} from "@/features/data-sources/types"

export type GoogleFormsManualCsvConnectCommand = {
  formUrlOrId: string
  displayName: string
  fileName: string
  identityColumn: string
  timestampColumn: string
  csvText: string
}

export type GoogleFormsManualCsvUpdateCommand = Omit<
  GoogleFormsManualCsvConnectCommand,
  "formUrlOrId"
>

export type ImapCredentialReader = {
  readImapPassword(input: {
    workspaceId: string
    sourceId: string
  }): Promise<string>
}

export function createDataSourceUseCases({
  workspace,
  queryPort,
  imapCommands,
  formsCommands,
  lifecycleCommands,
  imapConnectionTester,
  imapCredentialReader,
}: {
  workspace: DataSourceWorkspace
  queryPort: DataSourceQueryPort
  imapCommands: ImapSourceCommandPort
  formsCommands: GoogleFormsSourceCommandPort
  lifecycleCommands: SourceLifecycleCommandPort
  imapConnectionTester: ImapConnectionTester
  imapCredentialReader: ImapCredentialReader
}) {
  async function loadImapSource(sourceId: string) {
    const source = await queryPort.findByIdForWorkspace({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!source || source.type !== "imap") {
      throw new Error("source_not_found")
    }
    return source
  }

  async function loadGoogleFormsSource(sourceId: string) {
    const source = await queryPort.findByIdForWorkspace({
      workspaceId: workspace.id,
      sourceId,
    })
    if (!source || source.type !== "forms") {
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
    async connectImap(input: ImapConnectCommandDraft): Promise<ImapDataSource> {
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

      return imapCommands.connectImap({
        workspaceId: workspace.id,
        displayName: normalizeDataSourceDisplayName(input.displayName),
        connection,
        intake,
        folderSnapshot,
        password,
      })
    },

    async updateImapConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ): Promise<ImapDataSource> {
      const source = await loadImapSource(sourceId)
      const connection = buildImapConnectionConfig(input)
      const submittedPassword = input.password?.trim()
      const password = submittedPassword || (await readStoredPassword(sourceId))
      const { folders } = await imapConnectionTester.test({
        ...connection,
        password,
      })

      return imapCommands.updateImapConnection({
        workspaceId: workspace.id,
        sourceId,
        displayName: normalizeDataSourceDisplayName(
          input.displayName ?? source.displayName
        ),
        connection,
        password: submittedPassword || undefined,
        folderSnapshot: buildImapFolderSnapshot(folders),
      })
    },

    async updateImapIntakeSettings(
      sourceId: string,
      input: ImapIntakeSettingsCommand
    ): Promise<ImapDataSource> {
      await loadImapSource(sourceId)
      return imapCommands.updateImapIntake({
        workspaceId: workspace.id,
        sourceId,
        intake: buildImapIntakeSettings(input),
      })
    },

    async refreshImapFolders(sourceId: string): Promise<ImapDataSource> {
      const [source, password] = await Promise.all([
        loadImapSource(sourceId),
        readStoredPassword(sourceId),
      ])
      const { folders } = await imapConnectionTester.test({
        ...source.connection,
        password,
      })

      return imapCommands.updateImapFolderSnapshot({
        workspaceId: workspace.id,
        sourceId,
        folderSnapshot: buildImapFolderSnapshot(folders),
      })
    },

    async connectGoogleFormsManualCsv(
      input: GoogleFormsManualCsvConnectCommand
    ): Promise<GoogleFormsDataSource> {
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

      return formsCommands.connectGoogleFormsManualCsv({
        workspaceId: workspace.id,
        source,
        upload: {
          fileName: input.fileName.trim() || "google-forms-responses.csv",
          rows,
        },
      })
    },

    async updateGoogleFormsManualCsv(
      sourceId: string,
      input: GoogleFormsManualCsvUpdateCommand
    ): Promise<GoogleFormsDataSource> {
      const existingSource = await loadGoogleFormsSource(sourceId)
      const parsed = parseGoogleFormsCsv(input.csvText)
      const source = buildGoogleFormsManualCsvSourceConfig({
        formUrlOrId: existingSource.externalFormId,
        displayName: input.displayName,
        headers: parsed.headers,
        identityColumn: input.identityColumn,
        timestampColumn: input.timestampColumn,
      })
      const rows = buildGoogleFormsManualCsvUploadRows({
        source,
        rows: parsed.rows,
      })

      return formsCommands.updateGoogleFormsManualCsv({
        workspaceId: workspace.id,
        sourceId,
        source,
        upload: {
          fileName: input.fileName.trim() || "google-forms-responses.csv",
          rows,
        },
      })
    },

    async disconnect(sourceId: string) {
      await lifecycleCommands.disconnect({ workspaceId: workspace.id, sourceId })
    },

    async requestSync(sourceId: string) {
      await lifecycleCommands.requestSync({ workspaceId: workspace.id, sourceId })
    },

    async requestAllConfiguredSyncs() {
      return lifecycleCommands.requestAllSyncs({ workspaceId: workspace.id })
    },
  }
}
