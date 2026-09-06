import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  connectGoogleFormsApiDataSourceAction,
  connectGoogleFormsManualCsvDataSourceAction,
  inspectGoogleFormsApiAction,
  updateGoogleFormsManualCsvDataSourceAction,
} from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { FormsConnect } from "./forms-connect"

const refresh = vi.fn()
const replace = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh, replace }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  connectGoogleFormsManualCsvDataSourceAction: vi.fn(async () => ({
    data: { type: "forms", sourceSlug: "practice-intake" },
  })),
  updateGoogleFormsManualCsvDataSourceAction: vi.fn(async () => ({ data: {} })),
  describeGoogleFormsApiAction: vi.fn(async () => ({
    data: { serviceAccountEmail: "sync@tinyops.iam.gserviceaccount.com" },
  })),
  inspectGoogleFormsApiAction: vi.fn(async () => ({
    data: {
      serviceAccountEmail: "sync@tinyops.iam.gserviceaccount.com",
      formId: "1AbC_Def-1234567890",
      formTitle: "Practice intake",
      collectsEmail: false,
      questions: [
        { id: "q_email", title: "Your email" },
        { id: "q_goal", title: "What do you need?" },
      ],
    },
  })),
  connectGoogleFormsApiDataSourceAction: vi.fn(async () => ({
    data: { type: "forms", sourceSlug: "practice-intake" },
  })),
}))

function source(): DataSource {
  return {
    id: "forms",
    kind: "connector_type",
    icon: "forms",
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
    replace.mockReset()
    vi.mocked(connectGoogleFormsManualCsvDataSourceAction).mockClear()
    vi.mocked(updateGoogleFormsManualCsvDataSourceAction).mockClear()
    vi.mocked(inspectGoogleFormsApiAction).mockClear()
    vi.mocked(connectGoogleFormsApiDataSourceAction).mockClear()
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
    expect(replace).toHaveBeenCalledWith("/home/sources/forms/practice-intake")
    expect(refresh).not.toHaveBeenCalled()
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
    expect(refresh).toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
  })

  it("connects a live Google Form after checking service-account access", async () => {
    render(<FormsConnect source={source()} />)

    fireEvent.click(screen.getByRole("tab", { name: "Live sync" }))
    await screen.findByText("sync@tinyops.iam.gserviceaccount.com")

    fireEvent.change(screen.getByLabelText("Google Form URL or ID"), {
      target: {
        value: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      },
    })
    fireEvent.click(screen.getByRole("button", { name: /Check access/i }))

    await screen.findByText(/does not collect emails/)
    expect(inspectGoogleFormsApiAction).toHaveBeenCalledWith(
      "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit"
    )
    expect(screen.getByLabelText("Form name")).toHaveValue("Practice intake")
    expect(screen.getByLabelText("Client identity")).toHaveValue("q_email")

    fireEvent.change(screen.getByLabelText("Client identity"), {
      target: { value: "q_goal" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Connect form/i }))

    await waitFor(() =>
      expect(connectGoogleFormsApiDataSourceAction).toHaveBeenCalledWith({
        formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
        displayName: "Practice intake",
        identityQuestionId: "q_goal",
      })
    )
    expect(replace).toHaveBeenCalledWith("/home/sources/forms/practice-intake")
    expect(connectGoogleFormsManualCsvDataSourceAction).not.toHaveBeenCalled()
  })

  it("shows a read-only summary for connected live forms", () => {
    render(
      <FormsConnect
        source={{
          ...source(),
          kind: "data_source",
          title: "Practice intake live",
          connected: true,
          sourceId: "forms_source_2",
          sourceType: "forms",
          sourceSlug: "practice-intake-live",
          health: "healthy",
          lastSync: "synced",
          summaryStatId: "synced",
          forms: {
            connections: [
              {
                sourceId: "forms_source_2",
                externalFormId: "1AbC_Def-1234567890",
                displayName: "Practice intake live",
                connectionMode: "api",
                mapping: { identityColumn: "", timestampColumn: "" },
                identityQuestionId: "q_email",
                latestUpload: null,
              },
            ],
          },
        }}
      />
    )

    expect(screen.getByLabelText("Google Form ID")).toHaveValue(
      "1AbC_Def-1234567890"
    )
    expect(
      screen.getByText("Answer to the selected form question")
    ).toBeInTheDocument()
    expect(screen.queryByRole("tab")).not.toBeInTheDocument()
  })
})
