import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Listener = {
  type: string
  filter: { event: string; schema: string; table: string; filter: string }
  callback: () => void
}

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  listeners: [] as Listener[],
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock("@/lib/supabase/browser", () => ({
  createBrowserSupabaseClient: () => ({
    channel: mocks.channel,
    removeChannel: mocks.removeChannel,
  }),
}))

import { DataSourceSyncRealtimeRefresh } from "./sync-realtime-refresh"

function realtimeChannel() {
  const channel = {
    on: vi.fn((type: string, filter: Listener["filter"], callback: () => void) => {
      mocks.listeners.push({ type, filter, callback })
      return channel
    }),
    subscribe: vi.fn(() => channel),
  }
  return channel
}

describe("DataSourceSyncRealtimeRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.listeners.length = 0
    mocks.channel.mockReturnValue(realtimeChannel())
  })

  afterEach(() => {
    mocks.listeners.length = 0
    vi.useRealTimers()
  })

  it("subscribes to deduped source sync state and run changes", () => {
    render(
      <DataSourceSyncRealtimeRefresh
        sourceRowIds={["source_2", "source_1", "source_1"]}
      />
    )

    expect(mocks.channel).toHaveBeenCalledWith(
      "data-source-sync:source_1,source_2"
    )
    expect(mocks.listeners).toHaveLength(8)
    expect(mocks.listeners).toContainEqual(
      expect.objectContaining({
        type: "postgres_changes",
        filter: expect.objectContaining({
          event: "INSERT",
          table: "data_source_sync_states",
          filter: "source_id=eq.source_1",
        }),
      })
    )
  })

  it("debounces multiple sync changes into one refresh", async () => {
    render(<DataSourceSyncRealtimeRefresh sourceRowIds={["source_1"]} />)

    mocks.listeners[0]?.callback()
    mocks.listeners[1]?.callback()

    expect(mocks.refresh).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it("removes the realtime channel on unmount", () => {
    const { unmount } = render(
      <DataSourceSyncRealtimeRefresh sourceRowIds={["source_1"]} />
    )

    unmount()

    expect(mocks.removeChannel).toHaveBeenCalledWith(
      mocks.channel.mock.results[0]?.value
    )
  })
})
