"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { createBrowserSupabaseClient } from "@/lib/supabase/browser"

const REALTIME_REFRESH_DEBOUNCE_MS = 250

type RealtimePostgresChange = {
  event: "INSERT" | "UPDATE" | "DELETE"
  schema: "public"
  table: string
  filter: string
}

type RealtimeRouteRefreshSpec = {
  channelName: string
  changes: RealtimePostgresChange[]
  refreshOnSubscribe?: boolean
}

function RealtimeRouteRefresh({
  spec,
}: {
  spec: RealtimeRouteRefreshSpec | null
}) {
  const { refresh } = useRouter()

  React.useEffect(() => {
    if (!spec || !spec.channelName || spec.changes.length === 0) return

    const { channelName, changes, refreshOnSubscribe = false } = spec

    let refreshTimer: ReturnType<typeof setTimeout> | null = null
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      refreshTimer = setTimeout(() => {
        refreshTimer = null
        refresh()
      }, REALTIME_REFRESH_DEBOUNCE_MS)
    }

    const supabase = createBrowserSupabaseClient()
    const channel = supabase.channel(channelName)

    changes.forEach((change) => {
      channel.on("postgres_changes", change, scheduleRefresh)
    })

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED" && refreshOnSubscribe) {
        refresh()
      }
    })

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer)
      void supabase.removeChannel(channel)
    }
  }, [refresh, spec])

  return null
}

export { RealtimeRouteRefresh }
export type { RealtimePostgresChange, RealtimeRouteRefreshSpec }
