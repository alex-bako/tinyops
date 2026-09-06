import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TimelineSection } from "./timeline-section"
import type { ClientTimelineEventView } from "../_view-model"

const events: ClientTimelineEventView[] = [
  {
    eventKey: "event_email",
    sourceId: "source_1",
    sourceType: "imap",
    type: "email",
    date: "Mar 8, 2026, 08:00 UTC",
    title: "Replay access",
    summary: "Latest reply.",
    bodyItems: [{ kind: "text", text: "Latest reply." }],
    sensitive: false,
    tone: "brand",
    sourceLabel: "email",
  },
  {
    eventKey: "event_form",
    sourceId: "source_1",
    sourceType: "forms",
    type: "form",
    date: "Mar 3, 2026, 08:00 UTC",
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
  it.each([
    ["stripe", "Stripe"],
    ["mailerlite", "MailerLite"],
    ["forms", "Google Forms"],
    ["calendly", "Calendly"],
    ["teachable", "Teachable"],
    ["imap", "IMAP mailbox"],
    ["csv", "CSV upload"],
    ["future-connector", "Unknown source"],
  ])("shows the title, provider badge for %s, sensitivity, and full date in one header", (sourceType, label) => {
    render(<TimelineSection events={[{ ...events[1]!, sourceType }]} />)
    const badge = screen.getByText(label)
    expect(badge).toHaveAttribute("data-slot", "badge")
    expect(badge.querySelector("img, svg")).toHaveAttribute("aria-hidden", "true")
    expect(screen.getByText("sensitive")).toBeInTheDocument()
    expect(screen.queryByText("form · sensitive")).not.toBeInTheDocument()
    const header = badge.closest('[data-slot="timeline-head"]')
    expect(header).toContainElement(screen.getByText("Intake form"))
    const date = screen.getByText("Mar 3, 2026, 08:00 UTC")
    expect(header).toContainElement(date)
    expect(date.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
    expect(badge.closest('[data-slot="timeline-event"]')).toHaveAttribute("data-tone", "positive")
    expect(badge.closest('[data-slot="timeline-event"]')).toHaveAttribute("data-sensitive", "true")
  })

  it.each(["note", "email"] as const)("omits the badge for a %s without a source", (type) => {
    const { container } = render(
      <TimelineSection events={[{ ...events[0]!, type, sourceType: null }]} />
    )
    expect(container.querySelector('[data-slot="timeline-head"] [data-slot="badge"]')).toBeNull()
  })

  it("uses the event label when no title exists, including sensitivity", () => {
    render(<TimelineSection events={[{ ...events[1]!, title: "" }]} />)
    expect(screen.getByText("form · sensitive")).toBeInTheDocument()
  })

  it("renders no summary element when the body and summary are empty", () => {
    const { container } = render(
      <TimelineSection events={[{ ...events[0]!, bodyItems: [], summary: "" }]} />
    )
    expect(container.querySelector('[data-slot="timeline-summary"]')).toBeNull()
  })

  it("renders a tags block as one chip per value", () => {
    render(
      <TimelineSection
        events={[
          {
            ...events[0]!,
            eventKey: "event_added",
            bodyItems: [
              {
                kind: "tags",
                label: "Groups",
                values: ["Paid · annual", "Webinar July"],
              },
            ],
          },
        ]}
      />
    )

    expect(screen.getByText("Groups")).toBeInTheDocument()
    expect(screen.getByText("Paid · annual")).toBeInTheDocument()
    expect(screen.getByText("Webinar July")).toBeInTheDocument()
  })

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
            sourceId: "source_1",
    sourceType: null,
            type: "email",
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
