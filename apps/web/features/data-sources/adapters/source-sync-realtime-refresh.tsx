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
const EMPTY_SOURCE_ROW_IDS: string[] = []

function SourceSyncRealtimeRefresh({
  activeSourceRowIds = EMPTY_SOURCE_ROW_IDS,
  sourceRowIds,
}: {
  activeSourceRowIds?: string[]
  sourceRowIds: string[]
}) {
  const { refresh } = useRouter()
  const activeSourceRowIdKey = normalizeSourceRowIds(activeSourceRowIds).join(",")
  const sourceRowIdKey = normalizeSourceRowIds(sourceRowIds).join(",")
  const spec = React.useMemo(
    () =>
      createSourceSyncRealtimeRefreshSpec({
        sourceRowIds: sourceRowIdKey.split(","),
        refreshOnSubscribe: Boolean(activeSourceRowIdKey),
      }),
    [activeSourceRowIdKey, sourceRowIdKey]
  )

  React.useEffect(() => {
    if (!activeSourceRowIdKey) return

    const pollTimer = setInterval(refresh, ACTIVE_SYNC_POLL_MS)
    return () => clearInterval(pollTimer)
  }, [activeSourceRowIdKey, refresh])

  if (!spec) return null

  return <RealtimeRouteRefresh spec={spec} />
}

function normalizeSourceRowIds(sourceRowIds: string[]) {
  return Array.from(
    new Set(sourceRowIds.flatMap((id) => (id.trim() ? [id.trim()] : [])))
  ).sort()
}

function createSourceSyncRealtimeRefreshSpec({
  sourceRowIds,
  refreshOnSubscribe = false,
}: {
  sourceRowIds: string[]
  refreshOnSubscribe?: boolean
}): RealtimeRouteRefreshSpec | null {
  const normalizedSourceRowIds = normalizeSourceRowIds(sourceRowIds)
  if (normalizedSourceRowIds.length === 0) return null

  const spec: RealtimeRouteRefreshSpec = {
    channelName: `source-sync:${normalizedSourceRowIds.join(",")}`,
    changes: normalizedSourceRowIds.flatMap((sourceId) =>
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
