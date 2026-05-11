"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"

const SYNC_CHANGE_TABLES = [
  "data_source_sync_states",
  "data_source_sync_runs",
] as const

const SYNC_CHANGE_EVENTS = ["INSERT", "UPDATE"] as const
const SYNC_REFRESH_DEBOUNCE_MS = 250
const ACTIVE_SYNC_POLL_MS = 2000

function DataSourceSyncRealtimeRefresh({
  activeSourceRowIds = [],
  sourceRowIds,
}: {
  activeSourceRowIds?: string[]
  sourceRowIds: string[]
}) {
  const { refresh } = useRouter()
  const activeSourceRowIdKey = normalizeSourceRowIds(activeSourceRowIds).join(",")
  const sourceRowIdKey = normalizeSourceRowIds(sourceRowIds).join(",")

  React.useEffect(() => {
    const ids = sourceRowIdKey.split(",").filter(Boolean)
    if (ids.length === 0) return

    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        refresh()
      }, SYNC_REFRESH_DEBOUNCE_MS)
    }

    const supabase = createBrowserSupabaseClient()
    const channel = supabase.channel(`data-source-sync:${sourceRowIdKey}`)

    ids.forEach((sourceId) => {
      SYNC_CHANGE_TABLES.forEach((table) => {
        SYNC_CHANGE_EVENTS.forEach((event) => {
          channel.on(
            "postgres_changes",
            {
              event,
              schema: "public",
              table,
              filter: `source_id=eq.${sourceId}`,
            },
            scheduleRefresh
          )
        })
      })
    })

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && activeSourceRowIdKey) {
        refresh()
      }
    })

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [activeSourceRowIdKey, refresh, sourceRowIdKey])

  React.useEffect(() => {
    if (!activeSourceRowIdKey) return

    const pollTimer = setInterval(refresh, ACTIVE_SYNC_POLL_MS)
    return () => clearInterval(pollTimer)
  }, [activeSourceRowIdKey, refresh])

  return null
}

function normalizeSourceRowIds(sourceRowIds: string[]) {
  return [...new Set(sourceRowIds.filter(Boolean))].sort()
}

export { DataSourceSyncRealtimeRefresh }
