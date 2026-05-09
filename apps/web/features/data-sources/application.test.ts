import { describe, expect, it } from "vitest"

import { createDataSourceApplication } from "@/features/data-sources/application"
import type {
  DataSourceStore,
  ImapConfig,
  ImapConnectionTester,
  ImapDataSource,
} from "@/features/data-sources/types"

const workspace = {
  id: "workspace_1",
  role: "owner" as const,
}

function connectedImapSource(): ImapDataSource {
  return {
    id: "source_1",
    workspaceId: workspace.id,
    type: "imap",
    displayName: "IMAP mailbox",
    status: "connected",
    configVersion: 1,
    config: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "hello@example.com",
      historyWindow: "12mo",
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
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
  overrides: Partial<DataSourceStore> = {}
): DataSourceStore {
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
    async updateImapConfig() {
      throw new Error("unexpected config update")
    },
    async disconnect() {
      throw new Error("unexpected disconnect")
    },
    async requestSync() {
      throw new Error("unexpected sync request")
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
  it("connects IMAP without returning the submitted password", async () => {
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
        return connectedImapSource()
      },
    })

    const application = createDataSourceApplication({
      workspace,
      store,
      imapConnectionTester,
    })

    const result = await application.connectImap({
      host: " imap.example.com ",
      port: 993,
      encryption: "ssl",
      username: " hello@example.com ",
      password: "top-secret",
      historyWindow: "12mo",
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
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
        config: {
          host: "imap.example.com",
          username: "hello@example.com",
          watchedFolders: ["INBOX", "Clients"],
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

  it("updates IMAP connection settings without password by preserving import settings", async () => {
    const updatedConfigs: ImapConfig[] = []
    const testedConnections: unknown[] = []
    const source = connectedImapSource()
    const application = createDataSourceApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async updateImapConfig(input) {
          updatedConfigs.push(input.config)
          return { ...source, config: input.config }
        },
      }),
      imapConnectionTester: {
        async test(input) {
          testedConnections.push(input)
          return { folders: [] }
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

    expect(result).toMatchObject({ data: { config: { host: "imap.new.com" } } })
    expect(testedConnections).toEqual([])
    expect(updatedConfigs).toEqual([
      {
        host: "imap.new.com",
        port: 993,
        encryption: "starttls",
        username: "owner@example.com",
        historyWindow: "12mo",
        watchedFolders: ["INBOX", "Clients"],
        skipSenders: ["*@noreply.*"],
      },
    ])
  })

  it("updates IMAP import settings without preserving stale UI-owned connection drafts", async () => {
    const updatedConfigs: ImapConfig[] = []
    const source = connectedImapSource()
    const application = createDataSourceApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async updateImapConfig(input) {
          updatedConfigs.push(input.config)
          return { ...source, config: input.config }
        },
      }),
      imapConnectionTester: successfulTester,
    })

    await expect(
      application.updateImapImportSettings("source_1", {
        historyWindow: "all",
        watchedFolders: ["Receipts", " "],
        skipSenders: ["notifications@example.com"],
      })
    ).resolves.toMatchObject({ data: { config: { historyWindow: "all" } } })
    expect(updatedConfigs).toEqual([
      {
        ...source.config,
        historyWindow: "all",
        watchedFolders: ["Receipts"],
        skipSenders: ["notifications@example.com"],
      },
    ])
  })

  it("stores a new IMAP password through connect while preserving import settings", async () => {
    const testedConnections: unknown[] = []
    const persistedConnections: unknown[] = []
    const source = connectedImapSource()
    const application = createDataSourceApplication({
      workspace,
      store: dataSourceStore({
        async findByIdForWorkspace() {
          return source
        },
        async connectImap(input) {
          persistedConnections.push(input)
          return { ...source, config: input.config }
        },
      }),
      imapConnectionTester: {
        async test(input) {
          testedConnections.push(input)
          return { folders: [] }
        },
      },
    })

    await application.updateImapConnectionSettings("source_1", {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "hello@example.com",
      password: "new-secret",
    })

    expect(testedConnections).toMatchObject([{ password: "new-secret" }])
    expect(persistedConnections).toMatchObject([
      {
        password: "new-secret",
        config: {
          historyWindow: "12mo",
          watchedFolders: ["INBOX", "Clients"],
          skipSenders: ["*@noreply.*"],
        },
      },
    ])
  })

  it("denies source management for non-admin workspace roles before adapters run", async () => {
    const application = createDataSourceApplication({
      workspace: { id: workspace.id, role: "operator" },
      store: dataSourceStore({
        async findByIdForWorkspace() {
          throw new Error("policy should run before store")
        },
      }),
      imapConnectionTester: successfulTester,
    })

    await expect(
      application.updateImapImportSettings("source_1", {
        historyWindow: "90d",
        watchedFolders: ["INBOX"],
        skipSenders: [],
      })
    ).resolves.toEqual({ error: "source_manage_forbidden" })
  })
})
