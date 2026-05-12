import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  connectGoogleFormsManualCsvDataSourceAction,
  updateGoogleFormsManualCsvDataSourceAction,
} from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { FormsConnect } from "./forms-connect"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  connectGoogleFormsManualCsvDataSourceAction: vi.fn(async () => ({
    data: {},
  })),
  updateGoogleFormsManualCsvDataSourceAction: vi.fn(async () => ({ data: {} })),
}))

function source(): DataSource {
  return {
    id: "forms",
    kind: "connector_type",
    icon: "clipboard-list",
    title: "Google Forms",
    sub: "Import intake and feedback responses",
    category: "Forms",
    auth: "csv",
    connected: false,
    stats: [],
  }
}

describe("FormsConnect", () => {
  beforeEach(() => {
    refresh.mockReset()
    vi.mocked(connectGoogleFormsManualCsvDataSourceAction).mockClear()
    vi.mocked(updateGoogleFormsManualCsvDataSourceAction).mockClear()
  })

  it("uploads a mapped Google Forms CSV export", async () => {
    render(<FormsConnect source={source()} />)

    fireEvent.change(screen.getByLabelText("Google Form URL or ID"), {
      target: {
        value: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      },
    })
    fireEvent.change(screen.getByLabelText("Form name"), {
      target: { value: "Practice intake" },
    })
    const file = new File(
      [
        [
          "Timestamp,Email Address,Full name",
          "2026-05-10T09:15:00.000Z,anna@example.com,Anna Smith",
        ].join("\n"),
      ],
      "practice-intake.csv",
      { type: "text/csv" }
    )
    fireEvent.change(screen.getByLabelText("Responses CSV"), {
      target: { files: [file] },
    })

    await screen.findByText("1 response found")
    fireEvent.change(screen.getByLabelText("Client identity column"), {
      target: { value: "Email Address" },
    })
    fireEvent.change(screen.getByLabelText("Response timestamp column"), {
      target: { value: "Timestamp" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Upload CSV/i }))

    await waitFor(() =>
      expect(connectGoogleFormsManualCsvDataSourceAction).toHaveBeenCalledWith({
        formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
        displayName: "Practice intake",
        fileName: "practice-intake.csv",
        identityColumn: "Email Address",
        timestampColumn: "Timestamp",
        csvText: [
          "Timestamp,Email Address,Full name",
          "2026-05-10T09:15:00.000Z,anna@example.com,Anna Smith",
        ].join("\n"),
      })
    )
    expect(refresh).toHaveBeenCalled()
  })

  it("updates a connected Google Forms source instead of creating another", async () => {
    render(
      <FormsConnect
        source={{
          ...source(),
          kind: "data_source",
          title: "Practice intake",
          connected: true,
          sourceId: "forms_source_1",
          sourceType: "forms",
          sourceSlug: "practice-intake",
          health: "healthy",
          lastSync: "ready",
          summaryStatId: "submissions",
          forms: {
            connections: [
              {
                sourceId: "forms_source_1",
                externalFormId: "1AbC_Def-1234567890",
                displayName: "Practice intake",
                connectionMode: "manual_csv",
                mapping: {
                  identityColumn: "Email Address",
                  timestampColumn: "Timestamp",
                },
                latestUpload: null,
              },
            ],
          },
        }}
      />
    )

    fireEvent.change(screen.getByLabelText("Form name"), {
      target: { value: "Practice intake" },
    })
    const file = new File(
      [
        [
          "Timestamp,Email Address,Full name",
          "2026-05-10T09:15:00.000Z,anna@example.com,Anna Smith",
        ].join("\n"),
      ],
      "practice-intake.csv",
      { type: "text/csv" }
    )
    fireEvent.change(screen.getByLabelText("Responses CSV"), {
      target: { files: [file] },
    })

    await screen.findByText("1 response found")
    fireEvent.click(screen.getByRole("button", { name: /Upload CSV/i }))

    await waitFor(() =>
      expect(updateGoogleFormsManualCsvDataSourceAction).toHaveBeenCalledWith(
        "forms_source_1",
        {
          displayName: "Practice intake",
          fileName: "practice-intake.csv",
          identityColumn: "Email Address",
          timestampColumn: "Timestamp",
          csvText: [
            "Timestamp,Email Address,Full name",
            "2026-05-10T09:15:00.000Z,anna@example.com,Anna Smith",
          ].join("\n"),
        }
      )
    )
    expect(connectGoogleFormsManualCsvDataSourceAction).not.toHaveBeenCalled()
  })

  it("keeps the mock OAuth connection mode available", () => {
    render(<FormsConnect source={source()} />)

    fireEvent.click(screen.getByRole("tab", { name: "OAuth" }))

    expect(
      screen.getByText(/grant TinyOps read-only access/i)
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Connect Google Forms/i })
    ).toBeInTheDocument()
    expect(connectGoogleFormsManualCsvDataSourceAction).not.toHaveBeenCalled()
  })
})
