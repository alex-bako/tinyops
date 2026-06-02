import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TimelineSection } from "./timeline-section"
import type { ClientTimelineEventView } from "../_view-model"

const events: ClientTimelineEventView[] = [
  {
    eventKey: "event_email",
    date: "Mar 8",
    title: "Replay access",
    summary: "Latest reply.",
    bodyItems: [{ kind: "text", text: "Latest reply." }],
    sensitive: false,
    tone: "brand",
    sourceLabel: "email",
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
  },
]

describe("TimelineSection", () => {
  it("always renders bodies inline without any reveal toggle", () => {
    render(<TimelineSection events={events} />)

    expect(screen.getByText("Replay access")).toBeInTheDocument()
    expect(screen.getByText("Intake form")).toBeInTheDocument()

    // No "Show body" affordance anywhere — bodies are always visible.
    expect(screen.queryByRole("button")).toBeNull()

    // Email body renders immediately, no reveal needed.
    expect(screen.getByText("Latest reply.")).toBeInTheDocument()

    // Form (QA) body renders fully, including every answer.
    expect(screen.getByText("Goal")).toBeInTheDocument()
    expect(screen.getByText("More confidence")).toBeInTheDocument()
    expect(screen.getByText("Blocker")).toBeInTheDocument()
    expect(screen.getByText("Consistency")).toBeInTheDocument()
  })

  it("marks sensitive events without gating their body", () => {
    render(<TimelineSection events={events} />)

    expect(
      screen.getByText("More confidence").closest("[data-sensitive]")
    ).toHaveAttribute("data-sensitive", "true")
  })

  it("shows the summary only when an event has no body", () => {
    render(
      <TimelineSection
        events={[
          {
            eventKey: "event_empty",
            date: "Mar 1",
            title: "Replay access",
            summary: "No body text",
            bodyItems: [],
            sensitive: false,
            tone: "brand",
            sourceLabel: "email",
          },
        ]}
      />
    )

    expect(screen.getByText("No body text")).toBeInTheDocument()
  })
})
