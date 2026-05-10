import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  requestAllDataSourceSyncsAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  requestAllDataSourceSyncsAction: mocks.requestAllDataSourceSyncsAction,
}))

import { SourcesSyncAllButton } from "./sources-sync-all-button"

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

describe("SourcesSyncAllButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestAllDataSourceSyncsAction.mockResolvedValue({
      data: { queued: 2 },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("queues all configured sources and refreshes the source list", async () => {
    render(<SourcesSyncAllButton disabled={false} />)

    fireEvent.click(screen.getByRole("button", { name: "Sync all" }))

    await waitFor(() => {
      expect(mocks.requestAllDataSourceSyncsAction).toHaveBeenCalled()
      expect(mocks.refresh).toHaveBeenCalled()
    })
    expect(screen.getByRole("status")).toHaveTextContent("Queued 2 sources")
  })

  it("reports all-or-error sync failures", async () => {
    mocks.requestAllDataSourceSyncsAction.mockResolvedValue({
      error: "source_action_failed",
    })

    render(<SourcesSyncAllButton disabled={false} />)

    fireEvent.click(screen.getByRole("button", { name: "Sync all" }))

    expect(await screen.findByRole("status")).toHaveTextContent(
      "Could not queue syncs"
    )
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it("clears queued message after a fixed TTL", async () => {
    vi.useFakeTimers()

    render(<SourcesSyncAllButton disabled={false} />)

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Sync all" }))
      await flushMicrotasks()
    })

    expect(screen.getByRole("status")).toHaveTextContent("Queued 2 sources")

    await act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })
})
