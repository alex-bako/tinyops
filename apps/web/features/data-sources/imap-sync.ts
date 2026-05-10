import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"

import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
  ConnectorIngestionResult,
  NormalizedConnectorRecord,
} from "@/features/clients/ingestion"
import { matchesIntakeFilters } from "@/features/data-sources/imap-intake-filters"
import {
  addressEmails,
  buildImapConnectorRecord,
  ownerEmailSet,
  type ParsedMailLike,
} from "@/features/data-sources/imap-record-normalizer"
import type { ImapDataSource } from "@/features/data-sources/types"
import { createNoopLogger, type LoggerPort } from "@/lib/logging"
import type { Json } from "@/lib/database.types"

type ImapFlowConstructor = new (options: {
  host: string
  port: number
  secure: boolean
  doSTARTTLS: boolean
  auth: { user: string; pass: string }
  logger: false
}) => ImapSyncClient

type ImapSyncClient = {
  connect(): Promise<void>
  mailboxOpen(path: string): Promise<{ uidValidity?: bigint | number | string }>
  search(query: unknown, options?: { uid?: boolean }): Promise<number[] | false>
  fetch(
    uids: number[],
    query: { uid: true; source: true; envelope: true; internalDate: true },
    options: { uid: true }
  ): AsyncIterable<{ uid: number; source?: Buffer; internalDate?: Date | string }>
  logout(): Promise<void>
  close(): void
}

type ImapCursor = {
  folders?: Record<
    string,
    {
      uidValidity?: string
      lastUid?: number
      exhausted?: boolean
    }
  >
}

type ImapSkipReason =
  | "missing_source"
  | "skip_sender"
  | "no_external_participant"
  | "filter_rejected"

type ImapFolderDiagnostics = {
  path: string
  uidValidity: string
  startUid?: number
  endUid?: number
  searched: number
  fetched: number
  accepted: number
  skipped: number
  truncated: boolean
}

type ImapSyncDiagnostics = {
  folders: ImapFolderDiagnostics[]
  skips: Record<string, number>
}

export function createImapConnector({
  source,
  password,
  ownerEmails,
  manualReviewKeywords,
  ImapFlow: ImapFlowClient = ImapFlow as ImapFlowConstructor,
  now = new Date(),
  logger = createNoopLogger(),
}: {
  source: ImapDataSource
  password: string
  ownerEmails: string[]
  manualReviewKeywords: string[]
  ImapFlow?: ImapFlowConstructor
  now?: Date
  logger?: LoggerPort
}): ConnectorIngestionPort {
  async function collect(input: ConnectorIngestionInput, preview: boolean) {
    const syncLogger = logger.child({
      component: "imap_sync",
      sourceId: source.id,
      workspaceId: source.workspaceId,
      preview,
    })
    const client = new ImapFlowClient({
      host: source.connection.host,
      port: source.connection.port,
      secure: source.connection.encryption === "ssl",
      doSTARTTLS: source.connection.encryption === "starttls",
      auth: {
        user: source.connection.username,
        pass: password,
      },
      logger: false,
    })

    let connected = false
    try {
      syncLogger.debug({ event: "imap.connection.open" }, "opening IMAP connection")
      await client.connect()
      connected = true
      const result = await collectFromFolders({
        client,
        source,
        input,
        ownerEmails: ownerEmailSet(source.connection.username, ownerEmails),
        manualReviewKeywords,
        now,
        preview,
        logger: syncLogger,
      })
      await client.logout()
      return result
    } catch (error) {
      client.close()
      if (!connected) throw new Error("imap_connection_failed", { cause: error })
      throw error
    }
  }

  return {
    preview(input) {
      return collect(input, true)
    },
    sync(input) {
      return collect(input, false)
    },
  }
}

async function collectFromFolders({
  client,
  source,
  input,
  ownerEmails,
  manualReviewKeywords,
  now,
  preview,
  logger,
}: {
  client: ImapSyncClient
  source: ImapDataSource
  input: ConnectorIngestionInput
  ownerEmails: Set<string>
  manualReviewKeywords: string[]
  now: Date
  preview: boolean
  logger: LoggerPort
}): Promise<ConnectorIngestionResult> {
  const limit = input.limit ?? 50
  const cursor = readCursor(preview ? null : source.sync.cursor)
  const nextCursor: ImapCursor = { folders: { ...(cursor.folders ?? {}) } }
  const records: NormalizedConnectorRecord[] = []
  const diagnostics: ImapSyncDiagnostics = { folders: [], skips: {} }
  let truncated = false

  for (const folder of source.intake.watchedFolders) {
    const remaining = limit - records.length
    if (remaining <= 0) {
      truncated = true
      break
    }

    const mailbox = await client.mailboxOpen(folder)
    const uidValidity = String(mailbox.uidValidity ?? "")
    const folderCursor = cursor.folders?.[folder]
    const lastUid =
      folderCursor?.uidValidity === uidValidity ? folderCursor.lastUid ?? 0 : 0
    const uids = await searchFolderUids({
      client,
      source,
      lastUid,
      now,
      preview,
    })
    const batchUids = uids.slice(0, remaining)
    let lastProcessedUid = lastUid
    const folderDiagnostics: ImapFolderDiagnostics = {
      path: folder,
      uidValidity,
      ...(batchUids[0] !== undefined ? { startUid: batchUids[0] } : {}),
      searched: uids.length,
      fetched: 0,
      accepted: 0,
      skipped: 0,
      truncated: false,
    }

    for await (const message of client.fetch(
      batchUids,
      { uid: true, source: true, envelope: true, internalDate: true },
      { uid: true }
    )) {
      lastProcessedUid = message.uid
      folderDiagnostics.fetched += 1
      folderDiagnostics.endUid = message.uid
      if (!message.source) {
        skipMessage(diagnostics, folderDiagnostics, "missing_source")
        continue
      }
      const parsed = (await simpleParser(message.source)) as ParsedMailLike
      const skippedSender = shouldSkipSender(source, parsed)
      const record = buildImapConnectorRecord({
        source,
        uid: message.uid,
        uidValidity,
        folder,
        parsed,
        internalDate: message.internalDate,
        ownerEmails,
        manualReviewKeywords,
        fallbackDate: now,
      })
      if (!record) {
        skipMessage(
          diagnostics,
          folderDiagnostics,
          skippedSender ? "skip_sender" : "no_external_participant"
        )
        continue
      }
      if (!matchesIntakeFilters(source, parsed, record.bodyText)) {
        skipMessage(diagnostics, folderDiagnostics, "filter_rejected")
        continue
      }
      records.push(record)
      folderDiagnostics.accepted += 1
      if (records.length >= limit) break
    }

    const fullyProcessedBatch = lastProcessedUid === (batchUids.at(-1) ?? lastUid)
    const folderExhausted = fullyProcessedBatch && uids.length <= batchUids.length
    truncated = truncated || !folderExhausted
    folderDiagnostics.truncated = !folderExhausted
    nextCursor.folders![folder] = {
      uidValidity,
      lastUid: lastProcessedUid,
      exhausted: folderExhausted,
    }
    diagnostics.folders.push(folderDiagnostics)
    logger.info(
      {
        event: "imap.folder.scanned",
        folder,
        uidValidity,
        searched: folderDiagnostics.searched,
        fetched: folderDiagnostics.fetched,
        accepted: folderDiagnostics.accepted,
        skipped: folderDiagnostics.skipped,
        truncated: folderDiagnostics.truncated,
      },
      "IMAP folder scanned"
    )

    if (records.length >= limit) {
      truncated = true
      break
    }
  }

  return {
    records,
    truncated,
    cursor: nextCursor as Json,
    diagnostics: diagnostics as Json,
  }
}

function skipMessage(
  diagnostics: ImapSyncDiagnostics,
  folder: ImapFolderDiagnostics,
  reason: ImapSkipReason
) {
  folder.skipped += 1
  diagnostics.skips[reason] = (diagnostics.skips[reason] ?? 0) + 1
}

async function searchFolderUids({
  client,
  source,
  lastUid,
  now,
  preview,
}: {
  client: ImapSyncClient
  source: ImapDataSource
  lastUid: number
  now: Date
  preview: boolean
}) {
  const since = preview ? historySince(source.intake.historyWindow, now) : undefined
  const found = await client.search(
    since ? { since } : { all: true },
    { uid: true }
  )
  if (!found) return []
  return found
    .filter((uid) => uid > lastUid)
    .sort((a, b) => a - b)
}

function shouldSkipSender(source: ImapDataSource, parsed: ParsedMailLike) {
  return addressEmails(parsed.from).some((email) =>
    source.intake.skipSenders.some((pattern) => matchesEmailPattern(pattern, email))
  )
}

function matchesEmailPattern(pattern: string, email: string) {
  const escaped = pattern
    .trim()
    .toLowerCase()
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replaceAll("*", ".*")
  return new RegExp(`^${escaped}$`).test(email)
}

function readCursor(value: unknown): ImapCursor {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { folders: {} }
  }
  return value as ImapCursor
}

function historySince(
  window: ImapDataSource["intake"]["historyWindow"],
  now: Date
) {
  if (window === "all") return undefined
  const days = window === "30d" ? 30 : window === "90d" ? 90 : 365
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
