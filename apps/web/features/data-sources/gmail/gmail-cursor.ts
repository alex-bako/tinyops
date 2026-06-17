import type { Json } from "@/lib/database.types"
import type { ImapHistoryWindow } from "@/features/data-sources/types"

/**
 * Gmail sync progresses in two phases, both encoded in the source's
 * `data_source_sync_states.cursor` jsonb:
 *
 *  - `backfill`   — page through `messages.list` (one page per run) seeded from
 *                   the history window; capture a baseline `historyId` to hand
 *                   off to the incremental phase.
 *  - `incremental` — drive `users.history.list` from the stored `historyId`.
 *
 * When `history.list` 404s (the cursor outran Gmail's history retention) we
 * fall back to a bounded re-backfill since the last successful sync.
 */

export type GmailBackfillCursor = {
  phase: "backfill"
  pageToken: string | null
  baselineHistoryId: string | null
  query: string | null
}

export type GmailIncrementalCursor = {
  phase: "incremental"
  historyId: string
}

export type GmailCursor = GmailBackfillCursor | GmailIncrementalCursor

export function historyWindowToQuery(window: ImapHistoryWindow): string | null {
  switch (window) {
    case "30d":
      return "newer_than:30d"
    case "90d":
      return "newer_than:90d"
    case "12mo":
      return "newer_than:1y"
    case "all":
      return null
    default:
      return null
  }
}

export function initialBackfillCursor(
  window: ImapHistoryWindow
): GmailBackfillCursor {
  return {
    phase: "backfill",
    pageToken: null,
    baselineHistoryId: null,
    query: historyWindowToQuery(window),
  }
}

export function parseGmailCursor(raw: unknown): GmailCursor | null {
  if (!raw || typeof raw !== "object") return null
  const value = raw as Record<string, unknown>
  if (value.phase === "incremental" && typeof value.historyId === "string") {
    return { phase: "incremental", historyId: value.historyId }
  }
  if (value.phase === "backfill") {
    return {
      phase: "backfill",
      pageToken: typeof value.pageToken === "string" ? value.pageToken : null,
      baselineHistoryId:
        typeof value.baselineHistoryId === "string"
          ? value.baselineHistoryId
          : null,
      query: typeof value.query === "string" ? value.query : null,
    }
  }
  return null
}

export function serializeGmailCursor(cursor: GmailCursor): Json {
  return cursor as unknown as Json
}

export function reBackfillCursor(
  lastSyncedAt: string | null,
  now: Date
): GmailBackfillCursor {
  return {
    phase: "backfill",
    pageToken: null,
    baselineHistoryId: null,
    query: reBackfillQuery(lastSyncedAt, now),
  }
}

export function reBackfillQuery(lastSyncedAt: string | null, now: Date): string {
  if (!lastSyncedAt) return "newer_than:30d"
  const last = new Date(lastSyncedAt).getTime()
  if (Number.isNaN(last)) return "newer_than:30d"
  const days = Math.max(1, Math.ceil((now.getTime() - last) / 86_400_000) + 1)
  return `newer_than:${days}d`
}
