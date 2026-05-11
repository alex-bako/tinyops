import { act, render } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

type Listener = {
  type: string
  filter: { event: string; schema: string; table: string; filter: string }
  callback: () => void
}

type SubscribeCallback = (status: string) => void

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  channel: vi.fn(),
  removeChannel: vi.fn(),
  listeners: [] as Listener[],
  subscribeCallbacks: [] as SubscribeCallback[],
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

import {
  RealtimeRouteRefresh,
  type RealtimeRouteRefreshSpec,
} from "./realtime-route-refresh"

function realtimeChannel() {
  const channel = {
    on: vi.fn((type: string, filter: Listener["filter"], callback: () => void) => {
      mocks.listeners.push({ type, filter, callback })
      return channel
    }),
    subscribe: vi.fn((callback?: SubscribeCallback) => {
      if (callback) mocks.subscribeCallbacks.push(callback)
      return channel
    }),
  }
  return channel
}

function clientProfileSpec(
  overrides: Partial<RealtimeRouteRefreshSpec> = {}
): RealtimeRouteRefreshSpec {
  return {
    channelName: "client-profile:workspace_1",
    changes: [
      {
        event: "INSERT",
        schema: "public",
        table: "clients",
        filter: "workspace_id=eq.workspace_1",
      },
    ],
    ...overrides,
  }
}

describe("RealtimeRouteRefresh", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    mocks.listeners.length = 0
    mocks.subscribeCallbacks.length = 0
    mocks.channel.mockReturnValue(realtimeChannel())
  })

  afterEach(() => {
    mocks.listeners.length = 0
    mocks.subscribeCallbacks.length = 0
    vi.useRealTimers()
  })

  it("does not subscribe without a spec", () => {
    render(<RealtimeRouteRefresh spec={null} />)

    expect(mocks.channel).not.toHaveBeenCalled()
    expect(mocks.listeners).toEqual([])
  })

  it("subscribes every postgres change in the spec", () => {
    render(
      <RealtimeRouteRefresh
        spec={clientProfileSpec({
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
              table: "timeline_events",
              filter: "workspace_id=eq.workspace_1",
            },
          ],
        })}
      />
    )

    expect(mocks.channel).toHaveBeenCalledWith("client-profile:workspace_1")
    expect(mocks.listeners).toEqual([
      expect.objectContaining({
        type: "postgres_changes",
        filter: {
          event: "INSERT",
          schema: "public",
          table: "clients",
          filter: "workspace_id=eq.workspace_1",
        },
      }),
      expect.objectContaining({
        type: "postgres_changes",
        filter: {
          event: "UPDATE",
          schema: "public",
          table: "timeline_events",
          filter: "workspace_id=eq.workspace_1",
        },
      }),
    ])
  })

  it("debounces multiple realtime events into one refresh", async () => {
    render(<RealtimeRouteRefresh spec={clientProfileSpec()} />)

    mocks.listeners[0]?.callback()
    mocks.listeners[0]?.callback()

    expect(mocks.refresh).not.toHaveBeenCalled()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it("refreshes once after subscription is ready when requested", () => {
    render(
      <RealtimeRouteRefresh
        spec={clientProfileSpec({ refreshOnSubscribe: true })}
      />
    )

    expect(mocks.subscribeCallbacks).toHaveLength(1)

    mocks.subscribeCallbacks[0]?.("SUBSCRIBED")
    mocks.subscribeCallbacks[0]?.("CHANNEL_ERROR")

    expect(mocks.refresh).toHaveBeenCalledTimes(1)
  })

  it("clears pending refreshes and removes the channel on unmount", async () => {
    const { unmount } = render(<RealtimeRouteRefresh spec={clientProfileSpec()} />)

    mocks.listeners[0]?.callback()
    unmount()

    await act(async () => {
      vi.advanceTimersByTime(250)
    })

    expect(mocks.refresh).not.toHaveBeenCalled()
    expect(mocks.removeChannel).toHaveBeenCalledWith(
      mocks.channel.mock.results[0]?.value
    )
  })
})
