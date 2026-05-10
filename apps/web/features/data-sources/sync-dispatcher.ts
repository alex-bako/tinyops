type SyncDispatchFetcher = (
  input: string,
  init: RequestInit
) => Promise<{ ok: boolean; status: number }>

export type DataSourceSyncDispatchResult =
  | { dispatched: false }
  | { dispatched: true; ok: boolean; status: number }

export async function dispatchDataSourceSyncWorker({
  baseUrl,
  secret,
  fetcher = fetch,
}: {
  baseUrl: string | null
  secret: string | null
  fetcher?: SyncDispatchFetcher
}): Promise<DataSourceSyncDispatchResult> {
  const normalizedSecret = secret?.trim()
  if (!baseUrl || !normalizedSecret) return { dispatched: false }

  const response = await fetcher(new URL("/api/sync/run", baseUrl).toString(), {
    method: "POST",
    headers: { authorization: `Bearer ${normalizedSecret}` },
    cache: "no-store",
  })

  return {
    dispatched: true,
    ok: response.ok,
    status: response.status,
  }
}
