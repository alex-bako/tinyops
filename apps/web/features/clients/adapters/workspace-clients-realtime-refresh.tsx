"use client"

import * as React from "react"

import {
  RealtimeRouteRefresh,
  type RealtimeRouteRefreshSpec,
} from "@/lib/supabase/realtime-route-refresh"

const CLIENT_COUNT_CHANGE_EVENTS = ["INSERT", "UPDATE"] as const

/**
 * Keeps server-rendered, workspace-scoped client data (e.g. the sidebar client
 * count) fresh by refreshing the route whenever clients are inserted or updated
 * for the active workspace. Mounted app-wide so changes propagate on any page,
 * not just the clients list.
 *
 * DELETE is intentionally omitted: filtered DELETE realtime events require
 * `REPLICA IDENTITY FULL` on `public.clients`, which is not configured, and
 * hard-deleting clients is not currently a user flow.
 */
function WorkspaceClientsRealtimeRefresh({
  workspaceId,
}: {
  workspaceId: string
}) {
  const spec = React.useMemo(
    () => createWorkspaceClientsRealtimeRefreshSpec(workspaceId),
    [workspaceId]
  )

  if (!spec) return null

  return <RealtimeRouteRefresh spec={spec} />
}

function createWorkspaceClientsRealtimeRefreshSpec(
  workspaceId: string
): RealtimeRouteRefreshSpec | null {
  const normalizedWorkspaceId = workspaceId.trim()
  if (!normalizedWorkspaceId) return null

  return {
    channelName: `workspace-clients:${normalizedWorkspaceId}`,
    changes: CLIENT_COUNT_CHANGE_EVENTS.map((event) => ({
      event,
      schema: "public",
      table: "clients",
      filter: `workspace_id=eq.${normalizedWorkspaceId}`,
    })),
  }
}

export {
  WorkspaceClientsRealtimeRefresh,
  createWorkspaceClientsRealtimeRefreshSpec,
}
