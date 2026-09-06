import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type { DataSource } from "@/lib/sources"

import { FormsConfig } from "./forms-config"

const mocks = vi.hoisted(() => ({
  refresh: vi.fn(),
  disconnectDataSourceAction: vi.fn(),
  requestDataSourceSyncAction: vi.fn(),
}))

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  disconnectDataSourceAction: mocks.disconnectDataSourceAction,
  requestDataSourceSyncAction: mocks.requestDataSourceSyncAction,
}))

function source(): DataSource {
  return {
    id: "forms",
    kind: "data_source",
    icon: "forms",
    title: "Google Forms",
    sub: "2 forms connected",
    category: "Forms",
    auth: "multi",
    connected: true,
    sourceId: "forms_source_1",
    sourceType: "forms",
    sourceSlug: "practice-intake",
    health: "healthy",
    lastSync: "queued",
    summaryStatId: "submissions",
    stats: [],
    forms: {
      connections: [
        {
          sourceId: "forms_source_1",
          externalFormId: "1Practice",
          displayName: "Practice intake",
          connectionMode: "manual_csv",
          mapping: {
            identityColumn: "Email Address",
            timestampColumn: "Timestamp",
          },
          latestUpload: {
            id: "upload_1",
            fileName: "practice.csv",
            rowCount: 12,
            uploadedAt: "2026-05-10T00:00:00.000Z",
          },
          syncStatus: "idle",
        },
        {
          sourceId: "forms_source_2",
          externalFormId: "1Monthly",
          displayName: "Monthly check-in",
          connectionMode: "manual_csv",
          mapping: {
            identityColumn: "Email Address",
            timestampColumn: "Timestamp",
          },
          latestUpload: null,
          syncStatus: "queued",
        },
      ],
    },
  }
}

describe("FormsConfig", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requestDataSourceSyncAction.mockResolvedValue({ data: undefined })
    mocks.disconnectDataSourceAction.mockResolvedValue({ data: undefined })
  })

  it("renders per-form sync and disconnect actions for plural Google Forms", async () => {
    render(<FormsConfig source={source()} />)

    expect(screen.getByText("Practice intake")).toBeInTheDocument()
    expect(screen.getByText("Monthly check-in")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: /Sync now/i })).toHaveLength(2)
    expect(
      screen.getByRole("button", { name: "Disconnect Practice intake" })
    ).toBeInTheDocument()

    fireEvent.click(screen.getAllByRole("button", { name: /Sync now/i })[1]!)
    await waitFor(() =>
      expect(mocks.requestDataSourceSyncAction).toHaveBeenCalledWith(
        "forms_source_2"
      )
    )

    fireEvent.click(
      screen.getByRole("button", { name: "Disconnect Practice intake" })
    )
    await waitFor(() =>
      expect(mocks.disconnectDataSourceAction).toHaveBeenCalledWith(
        "forms_source_1"
      )
    )
  })
})
