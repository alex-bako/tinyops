import { canManageSources } from "@/features/data-sources/policy"
import {
  applyImapConfigPatch,
  buildImapConnectionPatch,
  buildImapImportSettingsPatch,
  normalizeImapConfigDraft,
  type ImapConnectionSettingsCommand,
  type ImapImportSettingsCommand,
} from "@/features/data-sources/imap"
import type {
  DataSourceStore,
  DataSourceWorkspace,
  ImapConnectionTester,
} from "@/features/data-sources/types"

export type DataSourceActionError =
  | "invalid_imap_config"
  | "imap_connection_failed"
  | "source_manage_forbidden"
  | "source_not_found"
  | "source_action_failed"

export type DataSourceActionResult<T> =
  | { data: T; error?: never }
  | { data?: never; error: DataSourceActionError }

export type ImapConfigCommand = {
  host: string
  port: number | string
  encryption: string
  username: string
  historyWindow: string
  watchedFolders: string[]
  skipSenders: string[]
}

export type ImapConnectCommand = ImapConfigCommand & {
  password: string
}

export type {
  ImapConnectionSettingsCommand,
  ImapImportSettingsCommand,
}

export function createDataSourceApplication({
  workspace,
  store,
  imapConnectionTester,
}: {
  workspace: DataSourceWorkspace
  store: DataSourceStore
  imapConnectionTester: ImapConnectionTester
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

  return {
    async listDataSources() {
      return store.listForWorkspace(workspace.id)
    },

    async findDataSource(sourceType: string) {
      if (!isSourceType(sourceType)) return null
      return store.findForWorkspace({
        workspaceId: workspace.id,
        sourceType,
      })
    },

    async connectImap(input: ImapConnectCommand) {
      return runManaged(async () => {
        const config = normalizeImapConfigDraft(input)
        const password = input.password.trim()
        if (!password) throw new Error("invalid_imap_config")

        await imapConnectionTester.test({ ...config, password })
        return store.connectImap({
          workspaceId: workspace.id,
          config,
          password,
        })
      })
    },

    async updateImapConfig(sourceId: string, input: ImapConfigCommand) {
      return runManaged(async () =>
        store.updateImapConfig({
          workspaceId: workspace.id,
          sourceId,
          config: normalizeImapConfigDraft(input),
        })
      )
    },

    async updateImapConnectionSettings(
      sourceId: string,
      input: ImapConnectionSettingsCommand
    ) {
      return runManaged(async () => {
        const source = await loadImapSource(sourceId)
        const config = applyImapConfigPatch(
          source.config,
          buildImapConnectionPatch(input)
        )
        const password = input.password?.trim() ?? ""

        if (password) {
          await imapConnectionTester.test({ ...config, password })
          return store.connectImap({
            workspaceId: workspace.id,
            config,
            password,
          })
        }

        return store.updateImapConfig({
          workspaceId: workspace.id,
          sourceId,
          config,
        })
      })
    },

    async updateImapImportSettings(
      sourceId: string,
      input: ImapImportSettingsCommand
    ) {
      return runManaged(async () => {
        const source = await loadImapSource(sourceId)
        return store.updateImapConfig({
          workspaceId: workspace.id,
          sourceId,
          config: applyImapConfigPatch(
            source.config,
            buildImapImportSettingsPatch(input)
          ),
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
