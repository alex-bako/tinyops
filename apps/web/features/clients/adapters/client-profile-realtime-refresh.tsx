"use client"

import * as React from "react"

import {
  RealtimeRouteRefresh,
  type RealtimeRouteRefreshSpec,
} from "@/lib/supabase/realtime-route-refresh"

const CLIENT_PROFILE_CHANGE_TABLES = ["clients", "timeline_events"] as const
const CLIENT_CHANGE_EVENTS = ["INSERT", "UPDATE"] as const

function ClientProfileRealtimeRefresh({ workspaceId }: { workspaceId: string }) {
  const spec = React.useMemo(
    () => createClientProfileRealtimeRefreshSpec(workspaceId),
    [workspaceId]
  )

  if (!spec) return null

  return <RealtimeRouteRefresh spec={spec} />
}

function createClientProfileRealtimeRefreshSpec(
  workspaceId: string
): RealtimeRouteRefreshSpec | null {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) return null

  return {
    channelName: `client-profile:${normalizedWorkspaceId}`,
    changes: CLIENT_PROFILE_CHANGE_TABLES.flatMap((table) =>
      CLIENT_CHANGE_EVENTS.map((event) => ({
        event,
        schema: "public",
        table,
        filter: `workspace_id=eq.${normalizedWorkspaceId}`,
      }))
    ),
  }
}

export { ClientProfileRealtimeRefresh, createClientProfileRealtimeRefreshSpec }
