import { simpleParser } from "mailparser"

import type {
  ConnectorIngestionInput,
  ConnectorIngestionResult,
  NormalizedConnectorRecord,
} from "@/features/clients/application/connector-ingestion"
import {
  type ImapFolderRole,
  planImapFolderSync,
} from "@/features/data-sources/imap-folder-sync-planner"
import {
  buildImapMessageFacts,
  type ParsedMailLike,
} from "@/features/data-sources/imap-message-facts"
import { buildImapConnectorRecordFromFacts } from "@/features/data-sources/imap-record-normalizer"
import {
  appendFolderDiagnostics,
  createImapSyncDiagnostics,
  recordImapSkip,
  type ImapFolderDiagnostics,
  type ImapSkipReason,
  type ImapSyncDiagnostics,
} from "@/features/data-sources/imap-sync-diagnostics"
import { decideImapThreadImport } from "@/features/data-sources/imap-thread-import-policy"
import {
  createImapThreadIndex,
  detectSentFolders,
  type ImapThreadIndexReader,
} from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"
import type { Json } from "@/lib/database.types"
import type { LoggerPort } from "@/lib/logging"

export type ImapSyncClient = {
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
  folders?: Record<string, ImapFolderCursorEntry>
}

type ImapFolderCursorEntry = {
  uidValidity?: string
  lastUid?: number
  exhausted?: boolean
}

type ImapFolderScanResult = {
  records: NormalizedConnectorRecord[]
  acceptedExternalIds: string[]
  folder: ImapFolderDiagnostics
  skips: Record<string, number>
  cursorEntry: ImapFolderCursorEntry
  truncated: boolean
}

export function createImapThreadedSync({
  client,
  source,
  ownerEmails,
  manualReviewKeywords,
  threadIndexReader,
  now,
  logger,
}: {
  client: ImapSyncClient
  source: ImapDataSource
  ownerEmails: Set<string>
  manualReviewKeywords: string[]
  threadIndexReader?: ImapThreadIndexReader
  now: Date
  logger: LoggerPort
}) {
  return {
    preview(input: ConnectorIngestionInput) {
      return collectFromFolders({
        client,
        source,
        input,
        ownerEmails,
        manualReviewKeywords,
        threadIndexReader,
        now,
        preview: true,
        logger,
      })
    },
    sync(input: ConnectorIngestionInput) {
      return collectFromFolders({
        client,
        source,
        input,
        ownerEmails,
        manualReviewKeywords,
        threadIndexReader,
        now,
        preview: false,
        logger,
      })
    },
  }
}

async function collectFromFolders({
  client,
  source,
  input,
  ownerEmails,
  manualReviewKeywords,
  threadIndexReader,
  now,
  preview,
  logger,
}: {
  client: ImapSyncClient
  source: ImapDataSource
  input: ConnectorIngestionInput
  ownerEmails: Set<string>
  manualReviewKeywords: string[]
  threadIndexReader?: ImapThreadIndexReader
  now: Date
  preview: boolean
  logger: LoggerPort
}): Promise<ConnectorIngestionResult> {
  const limit = input.limit ?? 50
  const cursor = readCursor(preview ? null : source.sync.cursor)
  let nextCursor: ImapCursor = { folders: { ...(cursor.folders ?? {}) } }
  const sentFolders = detectSentFolders(source.folderSnapshot.availableFolders)
  let diagnostics: ImapSyncDiagnostics = createImapSyncDiagnostics({ sentFolders })
  const threadSeed = await threadIndexReader?.read({
    workspaceId: input.workspaceId,
    sourceId: input.sourceId,
  })
  const threadIndex = createImapThreadIndex(threadSeed?.messageIds ?? [])
  const seenExternalIds = new Set<string>()
  const records: NormalizedConnectorRecord[] = []
  let truncated = false

  for (const item of planImapFolderSync({ source, sentFolders, preview })) {
    const remaining = limit - records.length
    if (remaining <= 0) {
      truncated = true
      break
    }

    const result = await scanFolder({
      client,
      source,
      cursor,
      seenExternalIds,
      threadIndex,
      ownerEmails,
      manualReviewKeywords,
      now,
      preview,
      logger,
      limit: remaining,
      folder: item.path,
      role: item.role,
    })

    records.push(...result.records)
    for (const externalId of result.acceptedExternalIds) {
      seenExternalIds.add(externalId)
    }
    nextCursor = {
      folders: {
        ...(nextCursor.folders ?? {}),
        [item.path]: result.cursorEntry,
      },
    }
    diagnostics = appendFolderDiagnostics({
      diagnostics,
      folder: result.folder,
      skips: result.skips,
    })
    truncated = result.truncated || truncated
    if (records.length >= limit) break
  }

  return {
    records,
    truncated,
    cursor: nextCursor as Json,
    diagnostics: diagnostics as Json,
  }
}

async function scanFolder({
  client,
  source,
  cursor,
  seenExternalIds,
  threadIndex,
  ownerEmails,
  manualReviewKeywords,
  now,
  preview,
  logger,
  limit,
  folder,
  role,
}: {
  client: ImapSyncClient
  source: ImapDataSource
  cursor: ImapCursor
  seenExternalIds: Set<string>
  threadIndex: ReturnType<typeof createImapThreadIndex>
  ownerEmails: Set<string>
  manualReviewKeywords: string[]
  now: Date
  preview: boolean
  logger: LoggerPort
  limit: number
  folder: string
  role: ImapFolderRole
}): Promise<ImapFolderScanResult> {
  const mailbox = await client.mailboxOpen(folder)
  const uidValidity = String(mailbox.uidValidity ?? "")
  const folderCursor = cursor.folders?.[folder]
  const hasUsableCursor = folderCursor?.uidValidity === uidValidity
  const lastUid = hasUsableCursor ? folderCursor.lastUid ?? 0 : 0
  const uids = await searchFolderUids({
    client,
    source,
    lastUid,
    now,
    preview,
  })
  const seedSentCursor = role === "sent" && !hasUsableCursor
  const batchUids = seedSentCursor ? [] : uids.slice(0, limit)
  let lastProcessedUid = seedSentCursor ? (uids.at(-1) ?? lastUid) : lastUid
  let folderDiagnostics: ImapFolderDiagnostics = {
    path: folder,
    uidValidity,
    ...(batchUids[0] !== undefined ? { startUid: batchUids[0] } : {}),
    searched: uids.length,
    fetched: 0,
    accepted: 0,
    skipped: 0,
    truncated: false,
  }
  let skips: Record<string, number> = {}
  const records: NormalizedConnectorRecord[] = []
  const acceptedExternalIds: string[] = []
  const folderSeenExternalIds = new Set(seenExternalIds)

  function skip(reason: ImapSkipReason) {
    folderDiagnostics = {
      ...folderDiagnostics,
      skipped: folderDiagnostics.skipped + 1,
    }
    skips = recordImapSkip(skips, reason)
  }

  if (batchUids.length > 0) {
    for await (const message of client.fetch(
      batchUids,
      { uid: true, source: true, envelope: true, internalDate: true },
      { uid: true }
    )) {
      lastProcessedUid = message.uid
      folderDiagnostics = {
        ...folderDiagnostics,
        fetched: folderDiagnostics.fetched + 1,
        endUid: message.uid,
      }
      if (!message.source) {
        skip("missing_source")
        continue
      }

      const parsed = (await simpleParser(message.source)) as ParsedMailLike
      const factsResult = buildImapMessageFacts({
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
      if (!factsResult.ok) {
        skip(factsResult.reason)
        continue
      }

      const decision = decideImapThreadImport({
        source,
        facts: factsResult.facts,
        threadIndex,
      })
      if (!decision.import) {
        skip(decision.reason)
        continue
      }
      if (folderSeenExternalIds.has(factsResult.facts.externalId)) {
        skip("duplicate_message")
        continue
      }

      const record = buildImapConnectorRecordFromFacts({
        source,
        facts: factsResult.facts,
        thread: {
          headers: factsResult.facts.headers,
          folderRole: role,
          importReason: decision.reason,
          anchored: decision.anchored,
        },
      })

      folderSeenExternalIds.add(record.externalId)
      acceptedExternalIds.push(record.externalId)
      records.push(record)
      threadIndex.anchor(factsResult.facts.headers)
      folderDiagnostics = {
        ...folderDiagnostics,
        accepted: folderDiagnostics.accepted + 1,
      }
      if (records.length >= limit) break
    }
  }

  const fullyProcessedBatch = lastProcessedUid === (batchUids.at(-1) ?? lastUid)
  const folderExhausted =
    seedSentCursor || (fullyProcessedBatch && uids.length <= batchUids.length)
  folderDiagnostics = {
    ...folderDiagnostics,
    truncated: !folderExhausted,
  }
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

  return {
    records,
    acceptedExternalIds,
    folder: folderDiagnostics,
    skips,
    cursorEntry: {
      uidValidity,
      lastUid: lastProcessedUid,
      exhausted: folderExhausted,
    },
    truncated: !folderExhausted || records.length >= limit,
  }
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
