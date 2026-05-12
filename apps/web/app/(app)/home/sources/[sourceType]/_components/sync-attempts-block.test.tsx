import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { SyncAttemptsBlock } from "./sync-attempts-block"

describe("SyncAttemptsBlock", () => {
  it("renders recent sync attempt status, trigger, and safe detail", () => {
    render(
      <SyncAttemptsBlock
        attempts={[
          {
            trigger: "cron",
            status: "succeeded",
            startedAt: "2026-05-10T08:03:00.000Z",
            finishedAt: "2026-05-10T08:03:04.000Z",
            label: "Succeeded",
            detail: "1 client, 2 records, 2 events",
          },
          {
            trigger: "immediate",
            status: "failed",
            startedAt: "2026-05-10T08:01:00.000Z",
            finishedAt: "2026-05-10T08:01:02.000Z",
            label: "Failed",
            detail: "ingestion_failed: Could not persist synced records",
          },
        ]}
      />
    )

    expect(screen.getByText("Recent sync attempts")).toBeInTheDocument()
    expect(screen.getByText("cron")).toBeInTheDocument()
    expect(screen.getByText("immediate")).toBeInTheDocument()
    expect(screen.getByText("May 10, 08:03 UTC")).toBeInTheDocument()
    expect(screen.queryByText("2026-05-10T08:03:00.000Z")).not.toBeInTheDocument()
    expect(
      screen.getByText("ingestion_failed: Could not persist synced records")
    ).toBeInTheDocument()
  })
})
