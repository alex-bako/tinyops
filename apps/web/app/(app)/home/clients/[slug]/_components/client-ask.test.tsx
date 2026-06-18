import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatStatus } from "ai"

import type { AskMessage, GroundedAnswerData } from "@/features/ask/application/client-ask"
import { ClientAsk } from "./client-ask"

// --- controllable useChat mock -------------------------------------------
const sendMessage = vi.fn()
const setMessages = vi.fn()
const stop = vi.fn()
const regenerate = vi.fn()
let chatState: { messages: AskMessage[]; status: ChatStatus; error?: Error } = {
  messages: [],
  status: "ready",
}

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    ...chatState,
    sendMessage,
    setMessages,
    stop,
    regenerate,
    error: chatState.error,
  }),
}))

// Capture how the chat transport is configured so we can assert the endpoint.
const transportCtor = vi.fn()
vi.mock("ai", () => ({
  DefaultChatTransport: class {
    constructor(options: unknown) {
      transportCtor(options)
    }
  },
}))

// The markdown renderer is heavy (Streamdown + plugins); stub it out.
vi.mock("@/components/ai-elements/message", () => ({
  MessageResponse: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}))

const exampleQuestions = [
  "What has Anna actually asked me for?",
  "When did Anna last really engage?",
]

function answer(overrides: Partial<GroundedAnswerData> = {}): GroundedAnswerData {
  return {
    question: "What has Anna actually asked me for?",
    askedBy: "Alex Bako",
    lead: "Mostly practical access.",
    body: "Logistics, not substance.",
    scope: "Grounded in 9 events for Anna",
    confidencePct: 86,
    sources: [
      {
        name: "Anna Smith",
        email: "anna@example.com",
        sourceIcon: "mail",
        sourceLabel: "imap",
        when: "Mar 8",
        snippet: "Asked for replay steps.",
      },
    ],
    followUps: ["Is anything sensitive?"],
    ...overrides,
  }
}

function userMessage(id: string, text: string): AskMessage {
  return { id, role: "user", parts: [{ type: "text", text }] }
}

function assistantMessage(id: string, data: GroundedAnswerData): AskMessage {
  return { id, role: "assistant", parts: [{ type: "data-answer", data }] }
}

/** A complete one-turn thread (question + its answer). */
function answeredThread(data: GroundedAnswerData = answer()): AskMessage[] {
  return [userMessage("u1", data.question), assistantMessage("a1", data)]
}

function renderAsk(
  props: Partial<React.ComponentProps<typeof ClientAsk>> = {}
) {
  return render(
    <ClientAsk
      slug="anna-smith"
      clientName="Anna Smith"
      exampleQuestions={exampleQuestions}
      currentUserName="Alex Bako"
      {...props}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  chatState = { messages: [], status: "ready" }
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ClientAsk", () => {
  it("posts to the client's slug-scoped ask endpoint", () => {
    renderAsk()

    expect(transportCtor).toHaveBeenCalledWith(
      expect.objectContaining({ api: "/api/clients/anna-smith/ask" })
    )
  })

  it("renders the header and example questions when the thread is empty", () => {
    renderAsk()

    expect(screen.getByText(/ask about anna/i)).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /what has anna actually asked me for\?/i })
    ).toBeInTheDocument()
  })

  it("asks the question when an example chip is clicked", () => {
    renderAsk()

    fireEvent.click(
      screen.getByRole("button", { name: /when did anna last really engage\?/i })
    )

    expect(sendMessage).toHaveBeenCalledWith({
      text: "When did Anna last really engage?",
    })
  })

  it("asks the typed question on submit", async () => {
    renderAsk()

    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Who is overdue?" },
    })
    fireEvent.submit(screen.getByRole("textbox").closest("form")!)

    await waitFor(() =>
      expect(sendMessage).toHaveBeenCalledWith({ text: "Who is overdue?" })
    )
  })

  it("echoes the in-flight question and shows the thinking shimmer", () => {
    chatState = { messages: [userMessage("u1", "Who is overdue?")], status: "submitted" }
    renderAsk()

    // Optimistic echo of the just-asked question, plus the reading shimmer.
    expect(screen.getByText("Who is overdue?")).toBeInTheDocument()
    expect(screen.getByText(/reading anna's timeline/i)).toBeInTheDocument()
    // Example chips give way to the thread once a question is in flight.
    expect(
      screen.queryByRole("button", { name: /what has anna actually asked me for\?/i })
    ).not.toBeInTheDocument()
  })

  it("renders the grounded answer once it arrives", () => {
    chatState = { messages: answeredThread(), status: "ready" }
    renderAsk()

    expect(screen.getByText("Grounded in 9 events for Anna")).toBeInTheDocument()
    expect(screen.getByText("Asked for replay steps.")).toBeInTheDocument()
  })

  it("attributes a turn to its asker in the shared thread", () => {
    chatState = { messages: answeredThread(answer({ askedBy: "Dana Lee" })), status: "ready" }
    renderAsk()

    expect(screen.getByText(/asked by Dana Lee/i)).toBeInTheDocument()
  })

  it("stacks multiple turns and only offers follow-ups on the latest", () => {
    chatState = {
      messages: [
        userMessage("u1", "Q one"),
        assistantMessage(
          "a1",
          answer({ question: "Q one", lead: "Answer one.", followUps: ["First follow-up"] })
        ),
        userMessage("u2", "Q two"),
        assistantMessage(
          "a2",
          answer({ question: "Q two", lead: "Answer two.", followUps: ["Second follow-up"] })
        ),
      ],
      status: "ready",
    }
    renderAsk()

    expect(screen.getByText("Answer one.")).toBeInTheDocument()
    expect(screen.getByText("Answer two.")).toBeInTheDocument()
    // Chips only on the latest turn.
    expect(
      screen.getByRole("button", { name: /second follow-up/i })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /first follow-up/i })
    ).not.toBeInTheDocument()
  })

  it("re-asks when a follow-up chip in the latest answer is clicked", () => {
    chatState = { messages: answeredThread(), status: "ready" }
    renderAsk()

    fireEvent.click(screen.getByRole("button", { name: /is anything sensitive\?/i }))

    expect(sendMessage).toHaveBeenCalledWith({ text: "Is anything sensitive?" })
  })

  it("disables the input while a request is in flight", () => {
    chatState = {
      messages: [userMessage("u1", "Q"), assistantMessage("a1", answer({ lead: "Partial" }))],
      status: "streaming",
    }
    renderAsk()

    expect(screen.getByRole("textbox")).toBeDisabled()
  })

  it("surfaces an error with a retry that regenerates the answer", () => {
    chatState = {
      messages: [userMessage("u1", "Q")],
      status: "error",
      error: new Error("boom"),
    }
    renderAsk()

    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
    fireEvent.click(screen.getByRole("button", { name: /try again/i }))
    expect(regenerate).toHaveBeenCalled()
  })

  it("hides the clear control from members who cannot manage the thread", () => {
    chatState = { messages: answeredThread(), status: "ready" }
    renderAsk({ canClearThread: false })

    expect(
      screen.queryByRole("button", { name: /clear conversation/i })
    ).not.toBeInTheDocument()
  })

  it("confirms, then DELETEs the thread and resets when Clear is used", async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 204 }))
    vi.stubGlobal("fetch", fetchMock)
    chatState = { messages: answeredThread(), status: "ready" }
    renderAsk({ canClearThread: true })

    fireEvent.click(screen.getByRole("button", { name: /clear conversation/i }))
    // A confirm step appears before anything destructive happens.
    expect(fetchMock).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: /^delete$/i }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith("/api/clients/anna-smith/ask", {
        method: "DELETE",
      })
    )
    await waitFor(() => expect(setMessages).toHaveBeenCalledWith([]))
  })
})
