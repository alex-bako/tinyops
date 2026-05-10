import { describe, expect, it, vi } from "vitest"

import {
  createDataSourceCommandApplication,
  createDataSourceQueryApplication,
} from "@/features/data-sources/application"
import type {
  DataSourceCommandStore,
  DataSourceReader,
  ImapConnectionTester,
  ImapDataSource,
  ImapIntakeSettings,
} from "@/features/data-sources/types"

const workspace = {
  id: "workspace_1",
  role: "owner" as const,
}

function connectedImapSource(
  intake: Partial<ImapIntakeSettings> = {}
): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: workspace.id,
    type: "imap",
    displayName: "IMAP mailbox",
    status: "connected",
    configVersion: 1,
    connection: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "hello@example.com",
    },
    intake: {
      historyWindow: "12mo",
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
      messageFilters: { mode: "and", rules: [] },
      ...intake,
    },
    folderSnapshot: {
      availableFolders: [
        { path: "INBOX", messages: 1204 },
        { path: "Clients", messages: 412 },
      ],
    },
    secret: {
      purpose: "imap_password",
      maskedValue: "••••••••cret",
    },
    sync: {
      status: "queued",
      historyWindow: "12mo",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    createdAt: "2026-05-09T00:00:00.000Z",
    updatedAt: "2026-05-09T00:00:00.000Z",
  }
}

function dataSourceStore(
  overrides: Partial<DataSourceCommandStore> = {}
): DataSourceCommandStore {
  return {
    async listForWorkspace() {
      return []
    },
    async findForWorkspace() {
      return null
    },
    async findByIdForWorkspace() {
      return null
    },
    async connectImap() {
      throw new Error("unexpected connect")
    },
    async updateImapConnection() {
      throw new Error("unexpected connection update")
    },
    async updateImapIntake() {
      throw new Error("unexpected intake update")
    },
    async updateImapFolderSnapshot() {
      throw new Error("unexpected folder snapshot update")
    },
    async disconnect() {
      throw new Error("unexpected disconnect")
    },
    async requestSync() {
      throw new Error("unexpected sync request")
    },
    async requestAllSyncs() {
      throw new Error("unexpected bulk sync request")
    },
    ...overrides,
  }
}

const successfulTester: ImapConnectionTester = {
  async test() {
    return { folders: [] }
  },
}

describe("data source application", () => {
  it("lists data sources through a read-only application without command adapters", async () => {
    const reader: DataSourceReader = {
      async listForWorkspace(workspaceId) {
        expect(workspaceId).toBe(workspace.id)
        return [connectedImapSource()]
      },
      async findForWorkspace() {
        throw new Error("unexpected find")
      },
      async findByIdForWorkspace() {
        throw new Error("unexpected find by id")
      },
    }

    const application = createDataSourceQueryApplication({
      workspace,
      reader,
    })

    await expect(application.listDataSources()).resolves.toHaveLength(1)
  })

  it("connects IMAP and persists verified folder snapshot without returning the password", async () => {
    const testedConnections: unknown[] = []
    const persistedConnections: unknown[] = []
    const imapConnectionTester: ImapConnectionTester = {
      async test(input) {
        testedConnections.push(input)
        return {
          folders: [
            { path: "INBOX", messages: 1204 },
            { path: "Clients", messages: 412 },
          ],
        }
      },
    }
    const store = dataSourceStore({
      async connectImap(input) {
        persistedConnections.push(input)
        return {
          ...connectedImapSource(input.intake),
          folderSnapshot: input.folderSnapshot,
        }
      },
    })

    const application = createDataSourceCommandApplication({
      workspace,
      store,
      imapConnectionTester,
      imapCredentialReader: {
        async readImapPassword() {
          throw new Error("unexpected secret read")
        },
      },
    })

    const result = await application.connectImap({
      host: " imap.example.com ",
      port: 993,
      encryption: "ssl",
      username: " hello@example.com ",
      password: "top-secret",
      historyWindow: "12mo",
    })

    expect(testedConnections).toMatchObject([
      {
        host: "imap.example.com",
        username: "hello@example.com",
        password: "top-secret",
      },
    ])
    expect(persistedConnections).toMatchObject([
      {
        workspaceId: workspace.id,
        password: "top-secret",
        connection: {
          host: "imap.example.com",
          username: "hello@example.com",
        },
        intake: {
          historyWindow: "12mo",
          watchedFolders: ["INBOX"],
          skipSenders: [],
          messageFilters: { mode: "and", rules: [] },
        },
        folderSnapshot: {
          availableFolders: [
            { path: "INBOX", messages: 1204 },
            { path: "Clients", messages: 412 },
          ],
        },
      },
    ])
    expect(result).toMatchObject({
      data: {
        id: "source_1",
        type: "imap",
        status: "connected",
        secret: { maskedValue: "••••••••cret" },
      },
    })
    expect(JSON.stringify(result)).not.toContain("top-secret")
  })

  it("updates IMAP connection settings with the stored password and preserves intake settings", async () => {
    const updatedConnections: unknown[] = []
    const testedConnections: unknown[] = []
    const source = connectedImapSource()
    const reads: unknown[] = []
    const application = createDataSourceCommandApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async updateImapConnection(input) {
          updatedConnections.push(input)
          return {
            ...source,
            connection: input.connection,
            intake: source.intake,
            folderSnapshot: input.folderSnapshot,
          }
        },
      }),
      imapConnectionTester: {
        async test(input) {
          testedConnections.push(input)
          return { folders: [{ path: "Receipts", messages: 9 }] }
        },
      },
      imapCredentialReader: {
        async readImapPassword(input) {
          reads.push(input)
          return "stored-secret"
        },
      },
    })

    const result = await application.updateImapConnectionSettings("source_1", {
      host: " IMAP.NEW.COM ",
      port: "993",
      encryption: "starttls",
      username: " owner@example.com ",
      password: "",
    })

    expect(result).toMatchObject({ data: { connection: { host: "imap.new.com" } } })
    expect(reads).toEqual([{ workspaceId: workspace.id, sourceId: "source_1" }])
    expect(testedConnections).toMatchObject([
      { host: "imap.new.com", password: "stored-secret" },
    ])
    expect(updatedConnections).toMatchObject([
      {
        connection: {
          host: "imap.new.com",
          port: 993,
          encryption: "starttls",
          username: "owner@example.com",
        },
        password: undefined,
        folderSnapshot: {
          availableFolders: [{ path: "Receipts", messages: 9 }],
        },
      },
    ])
  })

  it("updates IMAP connection settings with a new password without rebuilding intake", async () => {
    const updatedConnections: unknown[] = []
    const testedConnections: unknown[] = []
    const source = connectedImapSource({
      historyWindow: "all",
      watchedFolders: ["Clients"],
      skipSenders: ["*@noreply.*"],
      messageFilters: {
        mode: "and",
        rules: [
          {
            id: "rule_1",
            field: "subject",
            operator: "does_not_contain",
            value: "invoice",
          },
        ],
      },
    })
    const application = createDataSourceCommandApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async updateImapConnection(input) {
          updatedConnections.push(input)
          return {
            ...source,
            connection: input.connection,
            folderSnapshot: input.folderSnapshot,
          }
        },
      }),
      imapConnectionTester: {
        async test(input) {
          testedConnections.push(input)
          return { folders: [{ path: "Clients", messages: 44 }] }
        },
      },
      imapCredentialReader: {
        async readImapPassword() {
          throw new Error("new password should avoid secret read")
        },
      },
    })

    await expect(
      application.updateImapConnectionSettings("source_1", {
        host: "imap.new.com",
        port: 993,
        encryption: "ssl",
        username: "owner@example.com",
        password: "new-secret",
      })
    ).resolves.toMatchObject({
      data: {
        intake: {
          historyWindow: "all",
          watchedFolders: ["Clients"],
          skipSenders: ["*@noreply.*"],
        },
      },
    })
    expect(testedConnections).toMatchObject([{ password: "new-secret" }])
    expect(updatedConnections).toMatchObject([
      {
        password: "new-secret",
        folderSnapshot: {
          availableFolders: [{ path: "Clients", messages: 44 }],
        },
      },
    ])
  })

  it("updates IMAP intake settings without changing connection settings or folder snapshot", async () => {
    const updatedIntake: unknown[] = []
    const source = connectedImapSource()
    const application = createDataSourceCommandApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async updateImapIntake(input) {
          updatedIntake.push(input)
          return { ...source, intake: input.intake }
        },
      }),
      imapConnectionTester: successfulTester,
      imapCredentialReader: {
        async readImapPassword() {
          throw new Error("unexpected secret read")
        },
      },
    })

    await expect(
      application.updateImapIntakeSettings("source_1", {
        historyWindow: "all",
        watchedFolders: ["Receipts", " "],
        skipSenders: ["notifications@example.com"],
        messageFilters: {
          mode: "and",
          rules: [
            {
              id: "rule_1",
              field: "Subject",
              operator: "does not contain",
              value: " invoice ",
            },
          ],
        },
      })
    ).resolves.toMatchObject({ data: { intake: { historyWindow: "all" } } })
    expect(updatedIntake).toMatchObject([
      {
        intake: {
          historyWindow: "all",
          watchedFolders: ["Receipts"],
          skipSenders: ["notifications@example.com"],
          messageFilters: {
            mode: "and",
            rules: [
              {
                id: "rule_1",
                field: "subject",
                operator: "does_not_contain",
                value: "invoice",
              },
            ],
          },
        },
      },
    ])
  })

  it("refreshes IMAP folders from the stored password", async () => {
    const refreshed: unknown[] = []
    const testedConnections: unknown[] = []
    const source = connectedImapSource()
    const application = createDataSourceCommandApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async updateImapFolderSnapshot(input) {
          refreshed.push(input)
          return {
            ...source,
            folderSnapshot: input.folderSnapshot,
          }
        },
      }),
      imapConnectionTester: {
        async test(input) {
          testedConnections.push(input)
          return { folders: [{ path: "INBOX", messages: 2000 }] }
        },
      },
      imapCredentialReader: {
        async readImapPassword() {
          return "stored-secret"
        },
      },
    })

    await expect(application.refreshImapFolders("source_1")).resolves.toMatchObject({
      data: {
        folderSnapshot: {
          availableFolders: [{ path: "INBOX", messages: 2000 }],
        },
      },
    })
    expect(testedConnections).toMatchObject([
      { host: "imap.example.com", password: "stored-secret" },
    ])
    expect(refreshed).toMatchObject([
      {
        workspaceId: workspace.id,
        sourceId: "source_1",
        folderSnapshot: {
          availableFolders: [{ path: "INBOX", messages: 2000 }],
        },
      },
    ])
  })

  it("requests sync for every configured source through the bulk store port", async () => {
    const requestAllSyncs = vi.fn(async () => ({ queued: 2 }))
    const requestSync = vi.fn(async () => undefined)
    const application = createDataSourceCommandApplication({
      workspace,
      store: dataSourceStore({
        requestAllSyncs,
        requestSync,
      }),
      imapConnectionTester: successfulTester,
      imapCredentialReader: {
        async readImapPassword() {
          throw new Error("unexpected secret read")
        },
      },
    })

    await expect(application.requestAllConfiguredSyncs()).resolves.toEqual({
      data: { queued: 2 },
    })
    expect(requestAllSyncs).toHaveBeenCalledWith({ workspaceId: workspace.id })
    expect(requestSync).not.toHaveBeenCalled()
  })

  it("denies source management for non-admin workspace roles before adapters run", async () => {
    const application = createDataSourceCommandApplication({
      workspace: { id: workspace.id, role: "operator" },
      store: dataSourceStore({
        async findByIdForWorkspace() {
          throw new Error("policy should run before store")
        },
      }),
      imapConnectionTester: successfulTester,
      imapCredentialReader: {
        async readImapPassword() {
          throw new Error("policy should run before secret read")
        },
      },
    })

    await expect(
      application.updateImapIntakeSettings("source_1", {
        historyWindow: "90d",
        watchedFolders: ["INBOX"],
        skipSenders: [],
        messageFilters: { mode: "and", rules: [] },
      })
    ).resolves.toEqual({ error: "source_manage_forbidden" })
  })
})
