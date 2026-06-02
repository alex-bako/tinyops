import { render } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { RealtimeRouteRefreshSpec } from "@/lib/supabase/realtime-route-refresh"

const mocks = vi.hoisted(() => ({
  specs: [] as (RealtimeRouteRefreshSpec | null)[],
}))

vi.mock("@/lib/supabase/realtime-route-refresh", () => ({
  RealtimeRouteRefresh: ({
    spec,
  }: {
    spec: RealtimeRouteRefreshSpec | null
  }) => {
    mocks.specs.push(spec)
    return null
  },
}))

import {
  WorkspaceClientsRealtimeRefresh,
  createWorkspaceClientsRealtimeRefreshSpec,
} from "./workspace-clients-realtime-refresh"

describe("WorkspaceClientsRealtimeRefresh", () => {
  beforeEach(() => {
    mocks.specs.length = 0
  })

  it("creates a workspace-scoped clients refresh spec", () => {
    expect(createWorkspaceClientsRealtimeRefreshSpec(" workspace_1 ")).toEqual({
      channelName: "workspace-clients:workspace_1",
      changes: [
        {
          event: "INSERT",
          schema: "public",
          table: "clients",
          filter: "workspace_id=eq.workspace_1",
        },
        {
          event: "UPDATE",
          schema: "public",
          table: "clients",
          filter: "workspace_id=eq.workspace_1",
        },
      ],
    })
  })

  it("returns null spec for a blank workspace id", () => {
    expect(createWorkspaceClientsRealtimeRefreshSpec("   ")).toBeNull()
  })

  it("renders the realtime refresh with the spec", () => {
    render(<WorkspaceClientsRealtimeRefresh workspaceId="workspace_1" />)

    expect(mocks.specs).toHaveLength(1)
    expect(mocks.specs[0]?.channelName).toBe("workspace-clients:workspace_1")
  })

  it("renders nothing when the workspace id is blank", () => {
    render(<WorkspaceClientsRealtimeRefresh workspaceId="  " />)

    expect(mocks.specs).toHaveLength(0)
  })
})
