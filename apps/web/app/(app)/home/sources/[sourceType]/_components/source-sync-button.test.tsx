import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  requestDataSourceSyncAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  requestDataSourceSyncAction: mocks.requestDataSourceSyncAction,
}))

import { SourceSyncButton } from "./source-sync-button"

describe("SourceSyncButton", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestDataSourceSyncAction.mockResolvedValue({ data: undefined })
  })

  it("requests sync through the server action and refreshes the page", async () => {
    render(<SourceSyncButton sourceId="source_1" />)

    fireEvent.click(screen.getByRole("button", { name: "Sync now" }))

    await waitFor(() => {
      expect(mocks.requestDataSourceSyncAction).toHaveBeenCalledWith("source_1")
      expect(mocks.refresh).toHaveBeenCalled()
    })
  })

  it("shows an error when the sync request is rejected by the server action", async () => {
    mocks.requestDataSourceSyncAction.mockResolvedValue({
      error: "source_action_failed",
    })

    render(<SourceSyncButton sourceId="source_1" />)

    fireEvent.click(screen.getByRole("button", { name: "Sync now" }))

    expect(
      await screen.findByRole("status", {
        name: "Sync request status",
      })
    ).toHaveTextContent("Could not queue sync")
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
