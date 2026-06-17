import { simpleParser } from "mailparser"

import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
  ConnectorIngestionResult,
  NormalizedConnectorRecord,
} from "@/features/clients/application/connector-ingestion"
import {
  buildEmailMessageFacts,
  ownerEmailSet,
  type ParsedMailLike,
} from "@/features/data-sources/email/email-message-facts"
import {
  createGoogleGmailApiClient,
  isGmailHistoryExpiredError,
  isGmailRateLimitError,
  type GmailApiClient,
  type GmailRawMessage,
} from "@/features/data-sources/gmail/gmail-api-client"
import {
  initialBackfillCursor,
  parseGmailCursor,
  reBackfillCursor,
  serializeGmailCursor,
  type GmailBackfillCursor,
  type GmailCursor,
} from "@/features/data-sources/gmail/gmail-cursor"
import { buildGmailConnectorRecordFromFacts } from "@/features/data-sources/gmail/gmail-record-normalizer"
import type { GmailDataSource } from "@/features/data-sources/types"

const DEFAULT_BATCH = 50
const MAX_BACKOFF_MS = 8_000

export function createGmailConnector({
  source,
  accessToken,
  ownerEmails = [],
  manualReviewKeywords = [],
  apiClientFactory = createGoogleGmailApiClient,
  now,
  sleep = defaultSleep,
  maxRetries = 5,
}: {
  source: GmailDataSource
  accessToken: string
  ownerEmails?: string[]
  manualReviewKeywords?: string[]
  apiClientFactory?: (input: { accessToken: string }) => GmailApiClient
  now?: Date
  sleep?: (ms: number) => Promise<void>
  maxRetries?: number
}): ConnectorIngestionPort {
  const client = apiClientFactory({ accessToken })
  const owners = ownerEmailSet(source.connection.emailAddress, ownerEmails)
  const watchedLabelIds = source.intake.watchedFolders
  const resolveNow = () => now ?? new Date()

  async function fetchRawWithBackoff(id: string): Promise<GmailRawMessage> {
    let attempt = 0
    for (;;) {
      try {
        return await client.getMessageRaw(id)
      } catch (error) {
        if (isGmailRateLimitError(error) && attempt < maxRetries) {
          const base = Math.min(2 ** attempt * 200, MAX_BACKOFF_MS)
          await sleep(base + (attempt + 1) * 37)
          attempt += 1
          continue
        }
        throw error
      }
    }
  }

  async function toRecord(
    message: GmailRawMessage
  ): Promise<NormalizedConnectorRecord | null> {
    if (!message.raw) return null
    if (
      watchedLabelIds.length > 0 &&
      !message.labelIds.some((labelId) => watchedLabelIds.includes(labelId))
    ) {
      return null
    }

    const parsed = (await simpleParser(
      Buffer.from(message.raw, "base64url")
    )) as ParsedMailLike

    const facts = buildEmailMessageFacts({
      parsed,
      ownerEmails: owners,
      skipSenders: source.intake.skipSenders,
      manualReviewKeywords,
      fallbackDate: resolveNow(),
      internalDate: parseInternalDate(message.internalDate),
    })
    if (!facts.ok) return null

    return buildGmailConnectorRecordFromFacts({
      source,
      facts: facts.facts,
      gmail: {
        messageId: message.id,
        threadId: message.threadId,
        labelIds: message.labelIds,
      },
    })
  }

  async function fetchAndNormalize(
    ids: string[]
  ): Promise<NormalizedConnectorRecord[]> {
    const records: NormalizedConnectorRecord[] = []
    for (const id of ids) {
      const record = await toRecord(await fetchRawWithBackoff(id))
      if (record) records.push(record)
    }
    return records
  }

  async function collectBackfill(
    cursor: GmailBackfillCursor,
    limit: number
  ): Promise<ConnectorIngestionResult> {
    let baselineHistoryId = cursor.baselineHistoryId
    if (!baselineHistoryId) {
      baselineHistoryId = (await client.getProfile()).historyId
    }

    // Multiple labelIds on messages.list AND together; pass a single label
    // directly and otherwise post-filter in toRecord (documented over-fetch).
    const page = await client.listMessages({
      labelIds: watchedLabelIds.length === 1 ? watchedLabelIds : undefined,
      q: cursor.query ?? undefined,
      pageToken: cursor.pageToken ?? undefined,
      maxResults: limit,
    })
    const records = await fetchAndNormalize(page.messages.map((m) => m.id))

    if (page.nextPageToken) {
      return {
        records,
        truncated: true,
        cursor: serializeGmailCursor({
          phase: "backfill",
          pageToken: page.nextPageToken,
          baselineHistoryId,
          query: cursor.query,
        }),
      }
    }

    // Backfill drained — hand off to the incremental phase.
    const nextCursor: GmailCursor = baselineHistoryId
      ? { phase: "incremental", historyId: baselineHistoryId }
      : { phase: "backfill", pageToken: null, baselineHistoryId: null, query: cursor.query }
    return { records, truncated: false, cursor: serializeGmailCursor(nextCursor) }
  }

  async function collectIncremental(
    historyId: string,
    limit: number
  ): Promise<ConnectorIngestionResult> {
    const addedIds: string[] = []
    let latestHistoryId = historyId
    let pageToken: string | undefined
    try {
      do {
        const page = await client.listHistory({
          startHistoryId: historyId,
          pageToken,
        })
        addedIds.push(...page.addedMessageIds)
        if (page.historyId) latestHistoryId = page.historyId
        pageToken = page.nextPageToken ?? undefined
      } while (pageToken)
    } catch (error) {
      if (isGmailHistoryExpiredError(error)) {
        return collectBackfill(
          reBackfillCursor(source.sync.lastSyncedAt, resolveNow()),
          limit
        )
      }
      throw error
    }

    const records = await fetchAndNormalize(Array.from(new Set(addedIds)))
    return {
      records,
      truncated: false,
      cursor: serializeGmailCursor({
        phase: "incremental",
        historyId: latestHistoryId,
      }),
    }
  }

  async function collect(
    input: ConnectorIngestionInput
  ): Promise<ConnectorIngestionResult> {
    const limit = input.limit ?? DEFAULT_BATCH
    const cursor =
      parseGmailCursor(source.sync.cursor) ??
      initialBackfillCursor(source.intake.historyWindow)

    return cursor.phase === "incremental"
      ? collectIncremental(cursor.historyId, limit)
      : collectBackfill(cursor, limit)
  }

  return {
    // Preview shares the read path; the caller is responsible for not persisting.
    preview: collect,
    sync: collect,
  }
}

function parseInternalDate(value: string | null): Date | undefined {
  if (!value) return undefined
  const millis = Number(value)
  return Number.isNaN(millis) ? undefined : new Date(millis)
}

function defaultSleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms))
}
