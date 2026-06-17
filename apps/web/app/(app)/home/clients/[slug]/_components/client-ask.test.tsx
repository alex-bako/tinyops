import type { ReactNode } from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ChatStatus } from "ai"

import type { AskMessage, GroundedAnswerData } from "@/features/clients/application/client-ask"
import { ClientAsk } from "./client-ask"

// --- controllable useChat mock -------------------------------------------
const sendMessage = vi.fn()
const setMessages = vi.fn()
const stop = vi.fn()
let chatState: { messages: AskMessage[]; status: ChatStatus } = {
  messages: [],
  status: "ready",
}

vi.mock("@ai-sdk/react", () => ({
  useChat: () => ({
    ...chatState,
    sendMessage,
    setMessages,
    stop,
    error: undefined,
  }),
}))

// The markdown renderer is heavy (Streamdown + plugins); stub it out.
vi.mock("@/components/ai-elements/message", () => ({
  MessageResponse: ({ children }: { children?: ReactNode }) => <p>{children}</p>,
}))

const exampleQuestions = [
  "What has Anna actually asked me for?",
  "When did Anna last really engage?",
]

function renderAsk() {
  return render(
    <ClientAsk
      clientId="client_1"
      clientName="Anna Smith"
      clientEmail="anna@example.com"
      exampleQuestions={exampleQuestions}
    />
  )
}

const answer: GroundedAnswerData = {
  question: "What has Anna actually asked me for?",
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
}

function answeredMessage(): AskMessage {
  return {
    id: "m1",
    role: "assistant",
    parts: [{ type: "data-answer", data: answer }],
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  chatState = { messages: [], status: "ready" }
})

describe("ClientAsk", () => {
  it("renders the header and example questions when idle", () => {
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

  it("shows the thinking shimmer while a request is in flight", () => {
    chatState = { messages: [], status: "submitted" }
    renderAsk()

    expect(screen.getByText(/reading anna's timeline/i)).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: /what has anna actually asked me for\?/i })
    ).not.toBeInTheDocument()
  })

  it("renders the grounded answer once it arrives", () => {
    chatState = { messages: [answeredMessage()], status: "ready" }
    renderAsk()

    expect(screen.getByText("Grounded in 9 events for Anna")).toBeInTheDocument()
    expect(screen.getByText("Asked for replay steps.")).toBeInTheDocument()
  })

  it("re-asks when a follow-up chip in the answer is clicked", () => {
    chatState = { messages: [answeredMessage()], status: "ready" }
    renderAsk()

    fireEvent.click(screen.getByRole("button", { name: /is anything sensitive\?/i }))

    expect(sendMessage).toHaveBeenCalledWith({ text: "Is anything sensitive?" })
  })

  it("clears the conversation when Clear is pressed", () => {
    chatState = { messages: [answeredMessage()], status: "ready" }
    renderAsk()

    fireEvent.click(screen.getByRole("button", { name: /clear/i }))

    expect(setMessages).toHaveBeenCalledWith([])
  })
})
