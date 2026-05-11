import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { TimelineSection } from "./timeline-section"
import type { ClientTimelineEventView } from "../_view-model"

const events: ClientTimelineEventView[] = [
  {
    eventKey: "event_email",
    date: "Mar 8",
    title: "Re: replay library access",
    summary: "Short replay summary.",
    detailText: "Full imported replay email body.",
    sensitive: false,
    tone: "brand",
    sourceLabel: "email",
    collapsedLabel: "Show full event",
    expandedLabel: "Hide full event",
  },
  {
    eventKey: "event_form",
    date: "Mar 3",
    title: "Intake form submitted",
    summary: "Sensitive form summary.",
    detailText: "Full sensitive form body.",
    sensitive: true,
    tone: "positive",
    sourceLabel: "form · sensitive",
    collapsedLabel: "Show sensitive event",
    expandedLabel: "Hide sensitive event",
  },
]

describe("TimelineSection", () => {
  it("reveals full event text inline without closing other expanded events", () => {
    render(<TimelineSection events={events} />)

    expect(screen.getByText("Short replay summary.")).toBeInTheDocument()
    expect(screen.queryByText("Full imported replay email body.")).toBeNull()
    expect(screen.queryByText("Full sensitive form body.")).toBeNull()

    fireEvent.click(screen.getByRole("button", { name: "Show full event" }))
    fireEvent.click(screen.getByRole("button", { name: "Show sensitive event" }))

    expect(
      screen.getByText("Full imported replay email body.")
    ).toBeInTheDocument()
    expect(screen.getByText("Full sensitive form body.")).toBeInTheDocument()
    expect(
      screen.getByText("Full sensitive form body.").closest("[data-sensitive]")
    ).toHaveAttribute("data-sensitive", "true")

    fireEvent.click(
      screen.getAllByRole("button", { name: "Hide full event" })[0]!
    )

    expect(screen.queryByText("Full imported replay email body.")).toBeNull()
    expect(screen.getByText("Full sensitive form body.")).toBeInTheDocument()
  })
})
