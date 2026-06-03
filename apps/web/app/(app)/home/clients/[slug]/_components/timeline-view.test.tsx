import { fireEvent, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  ClientNoteView,
  ClientTimelineEventView,
  TimelineEventNotesMap,
} from "../_view-model"
import { TimelineView } from "./timeline-view"

// EventNotes (rendered when "Notes on events" is on) reaches for these.
vi.mock("../actions", () => ({
  createNoteAction: vi.fn(),
  updateNoteAction: vi.fn(),
  deleteNoteAction: vi.fn(),
}))
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock("sonner", () => ({
  toast: Object.assign(vi.fn(), { error: vi.fn() }),
}))

function eventView(
  overrides: Partial<ClientTimelineEventView> = {}
): ClientTimelineEventView {
  return {
    eventKey: "e_email",
    type: "email",
    date: "Mar 8",
    title: "Replay access",
    summary: "Summary",
    bodyItems: [{ kind: "text", text: "Email body" }],
    sensitive: false,
    tone: "brand",
    sourceLabel: "email",
    ...overrides,
  }
}

const SENSITIVE_FORM = eventView({
  eventKey: "e_form",
  type: "form",
  title: "Intake form",
  bodyItems: [{ kind: "text", text: "Form body" }],
  sensitive: true,
  tone: "positive",
  sourceLabel: "form · sensitive",
})

const pinnedNote: ClientNoteView = {
  id: "n1",
  text: "Pinned note",
  dateLabel: "Jun 1",
  occurredAt: "2026-06-01T00:00:00Z",
  parentEventId: "e_email",
  author: { name: "Jamie Park" },
}

function renderView(
  events: ClientTimelineEventView[],
  eventNotes: TimelineEventNotesMap = {}
) {
  return render(
    <TimelineView
      events={events}
      eventNotes={eventNotes}
      clientId="client_1"
      canManageNotes
      currentUserName="Jamie Park"
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("TimelineView", () => {
  it("hides sensitive events when the eye toggle is engaged", () => {
    renderView([eventView(), SENSITIVE_FORM])

    expect(screen.getByText("Intake form")).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: /Hide sensitive/ }))

    expect(screen.queryByText("Intake form")).not.toBeInTheDocument()
    expect(screen.getByText("Replay access")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Show sensitive/ })
    ).toBeInTheDocument()
  })

  it("shows an empty state with a reset when filters hide everything", () => {
    renderView([SENSITIVE_FORM])

    fireEvent.click(screen.getByRole("button", { name: /Hide sensitive/ }))

    expect(
      screen.getByText("No events match the current filter.")
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole("button", { name: "Reset filter" }))
    expect(screen.getByText("Intake form")).toBeInTheDocument()
  })

  it("reveals pinned notes only after turning on Notes on events", () => {
    renderView([eventView()], { e_email: [pinnedNote] })

    // Off by default: a chip advertises the note, the note body is hidden.
    expect(screen.queryByText("Pinned note")).not.toBeInTheDocument()

    fireEvent.click(screen.getByLabelText("Notes on events"))

    expect(screen.getByText("Pinned note")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Add note to this event/ })
    ).toBeInTheDocument()
  })
})
