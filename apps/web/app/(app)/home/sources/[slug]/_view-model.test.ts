import { describe, expect, it } from "vitest"

import { findSourceById, type DataSource } from "@/lib/sources"

import { createSourceDetailView } from "./_view-model"
import { getSourceUi } from "./source-registry"

describe("source detail view", () => {
  it("describes a healthy connected source with sync timing", () => {
    const source: DataSource = {
      ...findSourceById("imap")!,
      connected: true,
      health: "healthy",
      lastSync: "queued",
      summaryStatId: "synced",
      stats: [{ id: "synced", label: "Sync", value: "Queued" }],
    }
    const view = createSourceDetailView(source, getSourceUi("imap"))

    expect(view.connected).toBe(true)
    expect(view.connection.auth).toBe("imap")
    expect(view.connection.sourceId).toBe("imap")
    expect(view.config.sourceId).toBe("imap")
    expect(view.actions).toEqual({ canDisconnect: true, canSync: true })
    expect(view.header.logoClassName).toContain("cobalt")
    expect(view.header.status).toEqual({
      variant: "ok",
      label: "Connected · queued",
    })
    expect(view.activity).toEqual([])
  })

  it("flags a stale connected source as warn", () => {
    const source: DataSource = {
      ...findSourceById("csv")!,
      connected: true,
      health: "stale",
      lastSync: "3 days ago",
      stats: [],
    }
    const view = createSourceDetailView(source, getSourceUi("csv"))

    expect(view.header.status).toEqual({
      variant: "warn",
      label: "Stale · last synced 3 days ago",
    })
  })

  it("labels secret read failures as sync errors with safe detail", () => {
    const source: DataSource = {
      ...findSourceById("imap")!,
      connected: true,
      health: "error",
      lastSync: "error",
      stats: [],
      imap: {
        host: "imap.example.com",
        port: 993,
        encryption: "ssl",
        username: "owner@example.com",
        historyWindow: "90d",
        watchedFolders: ["INBOX"],
        skipSenders: [],
        messageFilters: { mode: "and", rules: [] },
        availableFolders: [],
        syncStatus: "error",
        lastError: "secret_read_failed: Could not read IMAP password",
      },
    }
    const view = createSourceDetailView(source, getSourceUi("imap"))

    expect(view.header.status).toEqual({
      variant: "warn",
      label: "Sync error",
      detail: "secret_read_failed: Could not read IMAP password",
    })
  })

  it("labels IMAP failures as connection errors", () => {
    const source: DataSource = {
      ...findSourceById("imap")!,
      connected: true,
      health: "error",
      lastSync: "error",
      stats: [],
      imap: {
        host: "imap.example.com",
        port: 993,
        encryption: "ssl",
        username: "owner@example.com",
        historyWindow: "90d",
        watchedFolders: ["INBOX"],
        skipSenders: [],
        messageFilters: { mode: "and", rules: [] },
        availableFolders: [],
        syncStatus: "error",
        lastError: "imap_connection_failed: IMAP connection failed",
      },
    }
    const view = createSourceDetailView(source, getSourceUi("imap"))

    expect(view.header.status).toEqual({
      variant: "warn",
      label: "Connection error",
      detail: "imap_connection_failed: IMAP connection failed",
    })
  })

  it("keeps recent sync attempts for the detail activity panel", () => {
    const source: DataSource = {
      ...findSourceById("imap")!,
      connected: true,
      health: "healthy",
      lastSync: "synced",
      stats: [],
      imap: {
        host: "imap.example.com",
        port: 993,
        encryption: "ssl",
        username: "owner@example.com",
        historyWindow: "90d",
        watchedFolders: ["INBOX"],
        skipSenders: [],
        messageFilters: { mode: "and", rules: [] },
        availableFolders: [],
        syncStatus: "idle",
        lastError: null,
        syncRuns: [
          {
            trigger: "cron",
            status: "succeeded",
            startedAt: "2026-05-10T08:03:00.000Z",
            finishedAt: "2026-05-10T08:03:04.000Z",
            errorCode: null,
            errorMessage: null,
            causeMessage: null,
            persistedCounts: { clients: 1, rawRecords: 2, timelineEvents: 2 },
          },
          {
            trigger: "immediate",
            status: "failed",
            startedAt: "2026-05-10T08:01:00.000Z",
            finishedAt: "2026-05-10T08:01:02.000Z",
            errorCode: "ingestion_failed",
            errorMessage: "Could not persist synced records",
            causeMessage: "column reference record_type is ambiguous",
            persistedCounts: null,
          },
        ],
      },
    }
    const view = createSourceDetailView(source, getSourceUi("imap"))

    expect(view.syncAttempts).toEqual([
      {
        trigger: "cron",
        status: "succeeded",
        startedAt: "2026-05-10T08:03:00.000Z",
        finishedAt: "2026-05-10T08:03:04.000Z",
        label: "Succeeded",
        detail: "1 client, 2 records, 2 events",
      },
      {
        trigger: "immediate",
        status: "failed",
        startedAt: "2026-05-10T08:01:00.000Z",
        finishedAt: "2026-05-10T08:01:02.000Z",
        label: "Failed",
        detail: "ingestion_failed: Could not persist synced records",
      },
    ])
  })

  it("describes a disconnected source with empty activity", () => {
    const view = createSourceDetailView(
      findSourceById("stripe")!,
      getSourceUi("stripe")
    )

    expect(view.connected).toBe(false)
    expect(view.connection.auth).toBe("oauth")
    expect(view.actions).toEqual({ canDisconnect: false, canSync: false })
    expect(view.header.status).toEqual({
      variant: "off",
      label: "Not connected",
    })
    expect(view.activity).toEqual([])
  })

  it("propagates the New tag from the catalog", () => {
    const view = createSourceDetailView(
      findSourceById("mailerlite")!,
      getSourceUi("mailerlite")
    )

    expect(view.header.isNew).toBe(true)
    expect(view.connection.auth).toBe("apikey")
  })
})
