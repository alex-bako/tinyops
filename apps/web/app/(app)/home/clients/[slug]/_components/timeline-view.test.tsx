import { act, fireEvent, render, screen, within } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import type {
  ClientNoteView,
  ClientTimelineEventView,
  TimelineEventNotesMap,
} from "../_view-model"
import { createNoteAction } from "../actions"
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
    sourceId: "source_1",
    sourceType: "imap",
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
  sourceType: "forms",
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

const formSubmissions = [3, 2, 1].map((number) => eventView({
  eventKey: `form_${number}`,
  sourceType: "forms",
  sourceId: "form_source",
  type: "form",
  title: `Form title ${number}`,
  date: `Aug 25, 2026, 09:3${number} UTC`,
  bodyItems: [{ kind: "qa", question: "Goal", answer: `Answer ${number}` }],
  sensitive: number === 2,
}))

describe("TimelineView", () => {
  it("browses grouped submissions without moving the card and defaults to a new submission", () => {
    const input = [formSubmissions[0]!, eventView(), ...formSubmissions.slice(1)]
    const { container, rerender } = renderView(input)
    const card = screen.getByText("Form title 3").closest('[data-slot="timeline-event"]')
    expect(container.querySelectorAll('[data-slot="timeline-event"]')).toHaveLength(2)
    expect(screen.getByText("2 timeline items")).toBeInTheDocument()
    expect(screen.getByRole("status")).toHaveTextContent("Submission 3 of 3 · Latest")
    expect(screen.getByRole("button", { name: "Next submission" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: "Previous submission" }))
    expect(screen.getByText("Answer 2")).toBeVisible()
    expect(screen.getByText("Aug 25, 2026, 09:32 UTC")).toBeVisible()
    expect(card).toHaveAttribute("data-sensitive", "true")
    expect(container.querySelector('[data-slot="timeline-event"]')).toBe(card)
    fireEvent.click(screen.getByRole("button", { name: "Previous submission" }))
    expect(screen.getByRole("status")).toHaveTextContent("Submission 1 of 3")
    expect(screen.getByRole("button", { name: "Previous submission" })).toBeDisabled()
    expect(screen.getByText("Answer 1")).toBeVisible()
    expect(card).not.toHaveAttribute("data-sensitive")
    fireEvent.click(screen.getByRole("button", { name: "Next submission" }))
    expect(screen.getByText("Answer 2")).toBeVisible()
    const newest = { ...formSubmissions[0]!, eventKey: "form_4", title: "New submission" }
    rerender(<TimelineView events={[newest, ...input]} eventNotes={{}} clientId="client_1" canManageNotes currentUserName="Jamie Park" />)
    expect(screen.getByText("New submission")).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent("Submission 4 of 4 · Latest")
    expect(container.querySelector('[data-slot="timeline-event"]')).toBe(card)
  })

  it("filters sensitive submissions before grouping and counts forms as one item", () => {
    renderView(formSubmissions)
    fireEvent.click(screen.getByRole("button", { name: /Hide sensitive/ }))
    expect(screen.getByRole("status")).toHaveTextContent("Submission 2 of 2 · Latest")
    fireEvent.click(screen.getByRole("button", { name: "Previous submission" }))
    expect(screen.getByText("Answer 1")).toBeVisible()
    expect(screen.queryByText("Answer 2")).not.toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Previous submission" })).toBeDisabled()
    fireEvent.click(screen.getByRole("button", { name: /^Filter/ }))
    const menu = screen.getByRole("dialog")
    expect(within(menu).getByText("1")).toBeInTheDocument()
    fireEvent.click(within(menu).getByRole("checkbox", { name: /Form/ }))
    expect(screen.getByText("No events match the current filter.")).toBeVisible()
  })

  it("keeps note drafts, pending saves, and ownership isolated while stepping", async () => {
    let finish!: (result: Awaited<ReturnType<typeof createNoteAction>>) => void
    vi.mocked(createNoteAction).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve }))
    renderView(formSubmissions, {
      form_3: [{ ...pinnedNote, parentEventId: "form_3", text: "Newest note" }],
      form_2: [{ ...pinnedNote, id: "n2", parentEventId: "form_2", text: "Older note" }],
    })
    fireEvent.click(screen.getByLabelText("Notes on events"))
    expect(screen.getByText("Newest note")).toBeVisible()
    expect(screen.getByText("Older note")).not.toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Add note to this event" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Add a note to this event" }), { target: { value: "Newest draft" } })
    fireEvent.click(screen.getByRole("button", { name: "Previous submission" }))
    expect(screen.getByText("Older note")).toBeVisible()
    fireEvent.click(screen.getByRole("button", { name: "Add note to this event" }))
    fireEvent.change(screen.getByRole("textbox", { name: "Add a note to this event" }), { target: { value: "Older draft" } })
    fireEvent.click(screen.getByRole("button", { name: "Next submission" }))
    expect(screen.getByRole("textbox", { name: "Add a note to this event" })).toHaveValue("Newest draft")
    fireEvent.click(screen.getByRole("button", { name: "Save note" }))
    expect(createNoteAction).toHaveBeenCalledWith({ clientId: "client_1", parentEventId: "form_3", text: "Newest draft" })
    fireEvent.click(screen.getByRole("button", { name: "Previous submission" }))
    expect(screen.getByRole("textbox", { name: "Add a note to this event" })).toHaveValue("Older draft")
    expect(screen.getByText("Newest draft")).not.toBeVisible()
    await act(async () => { finish({ data: { id: "saved-note", occurredAt: "2026-09-06T10:00:00Z" } }) })
    fireEvent.click(screen.getByRole("button", { name: "Next submission" }))
    expect(screen.getByText("Newest draft")).toBeVisible()
    expect(createNoteAction).toHaveBeenCalledTimes(1)
  })

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
