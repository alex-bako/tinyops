import { describe, expect, it } from "vitest"

import { findSourceById, type DataSource } from "@/lib/sources"

import { createSourceDetailView } from "./_view-model"
import { getSourceUi } from "./source-registry"

describe("source detail view", () => {
  it("describes a healthy connected source with sync timing", () => {
    const source: DataSource = {
      ...findSourceById("imap")!,
      connected: true,
      sourceRowIds: ["source_1"],
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
    expect(view.actions).toEqual({
      canDisconnect: true,
      canSync: true,
      sourceRowId: "source_1",
    })
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
            diagnostics: {
              folders: [{ path: "INBOX", searched: 3, accepted: 1, skipped: 2 }],
              skips: { skip_sender: 1, filter_rejected: 1 },
              ingestion: {
                attempted: 1,
                persisted: { clients: 1, rawRecords: 2, timelineEvents: 2 },
              },
            },
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
        detail: "1 imported from 3 scanned, 2 skipped",
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

  it("does not expose global header or danger actions for plural Google Forms", () => {
    const source: DataSource = {
      ...findSourceById("forms")!,
      connected: true,
      sourceRowIds: ["forms_source_1", "forms_source_2"],
      health: "healthy",
      lastSync: "synced",
      stats: [],
      forms: {
        connections: [
          {
            sourceRowId: "forms_source_1",
            externalFormId: "1Practice",
            displayName: "Practice intake",
            connectionMode: "manual_csv",
            mapping: {
              identityColumn: "Email Address",
              timestampColumn: "Timestamp",
            },
            latestUpload: null,
            syncRuns: [
              {
                trigger: "immediate",
                status: "succeeded",
                startedAt: "2026-05-10T08:00:00.000Z",
                finishedAt: "2026-05-10T08:00:01.000Z",
                errorCode: null,
                errorMessage: null,
                causeMessage: null,
                persistedCounts: {
                  clients: 1,
                  rawRecords: 1,
                  timelineEvents: 1,
                },
              },
            ],
          },
          {
            sourceRowId: "forms_source_2",
            externalFormId: "1Monthly",
            displayName: "Monthly check-in",
            connectionMode: "manual_csv",
            mapping: {
              identityColumn: "Email Address",
              timestampColumn: "Timestamp",
            },
            latestUpload: null,
            syncRuns: [
              {
                trigger: "cron",
                status: "failed",
                startedAt: "2026-05-10T09:00:00.000Z",
                finishedAt: "2026-05-10T09:00:01.000Z",
                errorCode: "sync_failed",
                errorMessage: "Sync failed",
                causeMessage: null,
                persistedCounts: null,
              },
            ],
          },
        ],
      },
    }

    const view = createSourceDetailView(source, getSourceUi("forms"))

    expect(view.actions).toEqual({ canDisconnect: false, canSync: false })
    expect(view.syncAttempts.map((attempt) => attempt.trigger)).toEqual([
      "cron",
      "immediate",
    ])
  })
})
