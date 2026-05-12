"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import {
  RealtimeRouteRefresh,
  type RealtimeRouteRefreshSpec,
} from "@/lib/supabase/realtime-route-refresh"

const SYNC_CHANGE_TABLES = [
  "data_source_sync_states",
  "data_source_sync_runs",
] as const

const SYNC_CHANGE_EVENTS = ["INSERT", "UPDATE"] as const
const ACTIVE_SYNC_POLL_MS = 2000
const EMPTY_SOURCE_IDS: string[] = []

function SourceSyncRealtimeRefresh({
  activeSourceIds = EMPTY_SOURCE_IDS,
  sourceIds,
}: {
  activeSourceIds?: string[]
  sourceIds: string[]
}) {
  const { refresh } = useRouter()
  const activeSourceIdKey = normalizeSourceIds(activeSourceIds).join(",")
  const sourceIdKey = normalizeSourceIds(sourceIds).join(",")
  const spec = React.useMemo(
    () =>
      createSourceSyncRealtimeRefreshSpec({
        sourceIds: sourceIdKey.split(","),
        refreshOnSubscribe: Boolean(activeSourceIdKey),
      }),
    [activeSourceIdKey, sourceIdKey]
  )

  React.useEffect(() => {
    if (!activeSourceIdKey) return

    const pollTimer = setInterval(refresh, ACTIVE_SYNC_POLL_MS)
    return () => clearInterval(pollTimer)
  }, [activeSourceIdKey, refresh])

  if (!spec) return null

  return <RealtimeRouteRefresh spec={spec} />
}

function normalizeSourceIds(sourceIds: string[]) {
  return Array.from(
    new Set(sourceIds.flatMap((id) => (id.trim() ? [id.trim()] : [])))
  ).sort()
}

function createSourceSyncRealtimeRefreshSpec({
  sourceIds,
  refreshOnSubscribe = false,
}: {
  sourceIds: string[]
  refreshOnSubscribe?: boolean
}): RealtimeRouteRefreshSpec | null {
  const normalizedSourceIds = normalizeSourceIds(sourceIds)
  if (normalizedSourceIds.length === 0) return null

  const spec: RealtimeRouteRefreshSpec = {
    channelName: `source-sync:${normalizedSourceIds.join(",")}`,
    changes: normalizedSourceIds.flatMap((sourceId) =>
      SYNC_CHANGE_TABLES.flatMap((table) =>
        SYNC_CHANGE_EVENTS.map((event) => ({
          event,
          schema: "public",
          table,
          filter: `source_id=eq.${sourceId}`,
        }))
      )
    ),
  }
  if (refreshOnSubscribe) spec.refreshOnSubscribe = true
  return spec
}

export {
  SourceSyncRealtimeRefresh,
  createSourceSyncRealtimeRefreshSpec,
}
