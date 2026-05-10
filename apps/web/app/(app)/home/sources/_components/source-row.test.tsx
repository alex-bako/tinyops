import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { SourcesPageRow } from "../_view-model"
import { SourceRow } from "./source-row"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  requestDataSourceSyncAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mocks.refresh,
  }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  requestDataSourceSyncAction: mocks.requestDataSourceSyncAction,
}))

const baseRow: SourcesPageRow = {
  id: "imap",
  sourceRowId: "source_1",
  icon: "mail",
  title: "IMAP mailbox",
  sub: "hello@example.com",
  connected: true,
  isNew: false,
  stats: [{ id: "synced", label: "Synced", value: "2m ago" }],
  action: "sync",
  href: "/home/sources/imap",
  primaryLabel: "Sync",
  configureLabel: "Configure IMAP mailbox",
  statusLabel: "2m ago",
}

describe("SourceRow", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestDataSourceSyncAction.mockResolvedValue({ data: undefined })
  })

  it("renders navigation and explicit row actions from row intent", () => {
    render(<SourceRow source={baseRow} />)

    expect(
      screen.getByRole("link", { name: "Configure IMAP mailbox" })
    ).toHaveAttribute("href", "/home/sources/imap")
    expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })

  it("shows a sync request error without refreshing the row", async () => {
    mocks.requestDataSourceSyncAction.mockResolvedValue({
      error: "source_action_failed",
    })

    render(<SourceRow source={baseRow} />)

    fireEvent.click(screen.getByRole("button", { name: "Sync" }))

    await waitFor(() => {
      expect(mocks.requestDataSourceSyncAction).toHaveBeenCalledWith("source_1")
    })
    expect(screen.getByRole("status")).toHaveTextContent("Could not queue sync")
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
