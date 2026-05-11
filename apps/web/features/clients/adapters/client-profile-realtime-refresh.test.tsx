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
  ClientProfileRealtimeRefresh,
  createClientProfileRealtimeRefreshSpec,
} from "./client-profile-realtime-refresh"

describe("ClientProfileRealtimeRefresh", () => {
  beforeEach(() => {
    mocks.specs.length = 0
  })

  it("creates a workspace-scoped Client Profile refresh spec", () => {
    expect(createClientProfileRealtimeRefreshSpec(" workspace_1 ")).toEqual({
      channelName: "client-profile:workspace_1",
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
        {
          event: "INSERT",
          schema: "public",
          table: "timeline_events",
          filter: "workspace_id=eq.workspace_1",
        },
        {
          event: "UPDATE",
          schema: "public",
          table: "timeline_events",
          filter: "workspace_id=eq.workspace_1",
        },
      ],
    })
  })

  it("does not create a refresh spec without a workspace id", () => {
    expect(createClientProfileRealtimeRefreshSpec(" ")).toBeNull()
  })

  it("passes the Client Profile refresh spec to realtime infrastructure", () => {
    render(<ClientProfileRealtimeRefresh workspaceId="workspace_1" />)

    expect(mocks.specs).toEqual([
      createClientProfileRealtimeRefreshSpec("workspace_1"),
    ])
  })

  it("renders no realtime infrastructure without a workspace id", () => {
    render(<ClientProfileRealtimeRefresh workspaceId="" />)

    expect(mocks.specs).toEqual([])
  })
})
