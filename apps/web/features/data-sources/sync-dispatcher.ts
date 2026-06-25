import type { DataSourceSyncWorkerResult } from "@/features/data-sources/sync-worker"

type SyncDispatchFetcher = (
  input: string,
  init: RequestInit
) => Promise<{ ok: boolean; status: number }>

export type DataSourceSyncDispatchResult =
  | { dispatched: false }
  | { dispatched: true; ok: boolean; status: number }

// ponytail: ~50k records per backfill burst (1000 hops × 50/batch). The cursor is
// persisted on every batch, so anything beyond the cap is resumed by the next cron
// drain — raise only if single-burst backfill latency actually matters.
export const MAX_SYNC_CHAIN = 1000

export type SyncChainStep =
  | { dispatch: true; chain: number }
  | { dispatch: false }

/**
 * Decide whether the immediate worker should re-fire itself to continue draining
 * the source it just synced. Pure so the branching is unit-testable in isolation.
 */
export function nextSyncChainStep(
  result: DataSourceSyncWorkerResult,
  chain: number
): SyncChainStep {
  if (!result.claimed || "failure" in result) return { dispatch: false }
  if (!result.truncated) return { dispatch: false }
  if (chain >= MAX_SYNC_CHAIN) return { dispatch: false }
  return { dispatch: true, chain: chain + 1 }
}

export async function dispatchDataSourceSyncWorker({
  baseUrl,
  secret,
  chain = 0,
  fetcher = fetch,
}: {
  baseUrl: string | null
  secret: string | null
  chain?: number
  fetcher?: SyncDispatchFetcher
}): Promise<DataSourceSyncDispatchResult> {
  const normalizedSecret = secret?.trim()
  if (!baseUrl || !normalizedSecret) return { dispatched: false }

  const response = await fetcher(new URL("/api/sync/run", baseUrl).toString(), {
    method: "POST",
    headers: {
      authorization: `Bearer ${normalizedSecret}`,
      ...(chain > 0 ? { "x-sync-chain": String(chain) } : {}),
    },
    cache: "no-store",
  })

  return {
    dispatched: true,
    ok: response.ok,
    status: response.status,
  }
}
