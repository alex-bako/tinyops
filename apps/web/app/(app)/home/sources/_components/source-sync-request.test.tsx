import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import { useSourceSyncRequest } from "./source-sync-request"

function Harness({
  request,
}: {
  request: () => Promise<{ data: { queued: number } } | { error: string }>
}) {
  const sync = useSourceSyncRequest({
    request,
    successMessage: (result) => `Queued ${result.queued}`,
    errorMessage: "Could not queue sync",
  })

  return (
    <>
      <button disabled={sync.pending} onClick={sync.run}>
        Sync
      </button>
      {sync.message ? <span role="status">{sync.message}</span> : null}
    </>
  )
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe("useSourceSyncRequest", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("runs a sync request, refreshes, then clears the status after a TTL", async () => {
    const request = vi.fn(async () => ({ data: { queued: 2 } }))

    render(<Harness request={request} />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sync" }))
      await flushMicrotasks()
    })

    expect(screen.getByRole("status")).toHaveTextContent("Queued 2")
    expect(request).toHaveBeenCalledTimes(1)
    expect(mocks.refresh).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("shows an error without refreshing when the sync request fails", async () => {
    const request = vi.fn(async () => ({ error: "source_action_failed" }))

    render(<Harness request={request} />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sync" }))
      await flushMicrotasks()
    })

    expect(screen.getByRole("status")).toHaveTextContent("Could not queue sync")
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
