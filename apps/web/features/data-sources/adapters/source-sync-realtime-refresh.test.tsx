import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import type { RealtimeRouteRefreshSpec } from "@/lib/supabase/realtime-route-refresh"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  specs: [] as (RealtimeRouteRefreshSpec | null)[],
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
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
  SourceSyncRealtimeRefresh,
  createSourceSyncRealtimeRefreshSpec,
} from "./source-sync-realtime-refresh"

describe("SourceSyncRealtimeRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.specs.length = 0
  })

  afterEach(() => {
    mocks.specs.length = 0
    vi.useRealTimers()
  })

  it("creates a deduped Source Sync refresh spec", () => {
    expect(
      createSourceSyncRealtimeRefreshSpec({
        sourceIds: ["source_2", "source_1", "source_1", ""],
      })
    ).toEqual({
      channelName: "source-sync:source_1,source_2",
      changes: [
        {
          event: "INSERT",
          schema: "public",
          table: "data_source_sync_states",
          filter: "source_id=eq.source_1",
        },
        {
          event: "UPDATE",
          schema: "public",
          table: "data_source_sync_states",
          filter: "source_id=eq.source_1",
        },
        {
          event: "INSERT",
          schema: "public",
          table: "data_source_sync_runs",
          filter: "source_id=eq.source_1",
        },
        {
          event: "UPDATE",
          schema: "public",
          table: "data_source_sync_runs",
          filter: "source_id=eq.source_1",
        },
        {
          event: "INSERT",
          schema: "public",
          table: "data_source_sync_states",
          filter: "source_id=eq.source_2",
        },
        {
          event: "UPDATE",
          schema: "public",
          table: "data_source_sync_states",
          filter: "source_id=eq.source_2",
        },
        {
          event: "INSERT",
          schema: "public",
          table: "data_source_sync_runs",
          filter: "source_id=eq.source_2",
        },
        {
          event: "UPDATE",
          schema: "public",
          table: "data_source_sync_runs",
          filter: "source_id=eq.source_2",
        },
      ],
    })
  })

  it("marks the spec for refresh after subscribe when active sync exists", () => {
    expect(
      createSourceSyncRealtimeRefreshSpec({
        sourceIds: ["source_1"],
        refreshOnSubscribe: true,
      })
    ).toMatchObject({
      channelName: "source-sync:source_1",
      refreshOnSubscribe: true,
    })
  })

  it("does not create a refresh spec without source ids", () => {
    expect(
      createSourceSyncRealtimeRefreshSpec({ sourceIds: ["", " "] })
    ).toBeNull()
  })

  it("passes the Source Sync refresh spec to realtime infrastructure", () => {
    render(
      <SourceSyncRealtimeRefresh
        sourceIds={["source_2", "source_1", "source_1"]}
      />
    )

    expect(mocks.specs).toEqual([
      createSourceSyncRealtimeRefreshSpec({
        sourceIds: ["source_2", "source_1", "source_1"],
      }),
    ])
  })

  it("renders no realtime infrastructure without source ids", () => {
    render(<SourceSyncRealtimeRefresh sourceIds={[]} />)

    expect(mocks.specs).toEqual([])
  })

  it("polls while Source Sync jobs are active as a fallback", async () => {
    render(
      <SourceSyncRealtimeRefresh
        sourceIds={["source_1"]}
        activeSourceIds={["source_1"]}
      />
    )

    expect(mocks.specs[0]).toMatchObject({ refreshOnSubscribe: true })

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })
})
