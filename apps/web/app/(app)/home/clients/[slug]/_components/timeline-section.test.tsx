import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TimelineSection } from "./timeline-section"
import type { ClientTimelineEventView } from "../_view-model"

const events: ClientTimelineEventView[] = [
  {
    eventKey: "event_email",
    date: "Mar 8",
    title: "Replay access",
    summary: "Full imported replay email body.",
    bodyItems: [{ kind: "text", text: "Full imported replay email body." }],
    sensitive: false,
    tone: "brand",
    sourceLabel: "email",
    collapsedLabel: "Show body",
    expandedLabel: "Hide body",
  },
  {
    eventKey: "event_form",
    date: "Mar 3",
    title: "Intake form",
    summary: "Goal: More confidence",
    bodyItems: [
      { kind: "qa", question: "Goal", answer: "More confidence" },
      { kind: "qa", question: "Blocker", answer: "Consistency" },
    ],
    sensitive: true,
    tone: "positive",
    sourceLabel: "form · sensitive",
    collapsedLabel: "Show sensitive body",
    expandedLabel: "Hide sensitive body",
  },
]

describe("TimelineSection", () => {
  it("reveals structured body inline without closing other expanded events", () => {
    render(<TimelineSection events={events} />)

    expect(screen.getByText("Replay access")).toBeInTheDocument()
    expect(screen.getByText("Intake form")).toBeInTheDocument()
    expect(screen.getByText("Full imported replay email body.")).toBeInTheDocument()
    expect(screen.getByText("Goal: More confidence")).toBeInTheDocument()
    expect(screen.queryByText("Blocker")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show body" }))
    fireEvent.click(screen.getByRole("button", { name: "Show sensitive body" }))

    expect(
      screen.getAllByText("Full imported replay email body.")[1]
    ).toBeInTheDocument()
    expect(screen.getByText("Goal")).toBeInTheDocument()
    expect(screen.getByText("More confidence")).toBeInTheDocument()
    expect(screen.getByText("Blocker")).toBeInTheDocument()
    expect(screen.getByText("Consistency")).toBeInTheDocument()
    expect(
      screen.getByText("More confidence").closest("[data-sensitive]")
    ).toHaveAttribute("data-sensitive", "true")

    fireEvent.click(
      screen.getAllByRole("button", { name: "Hide body" })[0]!
    )

    expect(screen.getAllByText("Full imported replay email body.")).toHaveLength(1)
    expect(screen.getByText("More confidence")).toBeInTheDocument()
  })
})
