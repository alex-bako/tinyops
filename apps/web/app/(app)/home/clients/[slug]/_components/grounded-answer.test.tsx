import type { ReactNode } from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { GroundedAnswerData } from "@/features/ask/application/client-ask"
import { GroundedAnswer } from "./grounded-answer"

// The markdown renderer (Streamdown + heavy plugins) is exercised elsewhere;
// here we only care about how GroundedAnswer composes its parts.
vi.mock("@/components/ai-elements/message", () => ({
  MessageResponse: ({
    children,
    className,
  }: {
    children?: ReactNode
    className?: string
  }) => (
    <div className={className} data-slot="response">
      {children}
    </div>
  ),
}))

const baseAnswer: GroundedAnswerData = {
  question: "What has Anna actually asked me for?",
  lead: "Mostly *practical access* — how to reach materials.",
  body: "Across nine events, Anna's questions cluster on logistics.",
  scope: "Grounded in 9 events for Anna",
  confidencePct: 86,
  sources: [
    {
      name: "Anna Smith",
      email: "anna@example.com",
      sourceIcon: "mail",
      sourceLabel: "imap",
      when: "Mar 8",
      snippet: "Asked for clearer steps to reach the replay library.",
    },
  ],
  followUps: ["Is anything sensitive?"],
}

describe("GroundedAnswer", () => {
  it("renders the question, scope, confidence and a citation card", () => {
    render(<GroundedAnswer answer={baseAnswer} onFollowUp={() => {}} />)

    expect(
      screen.getByText("What has Anna actually asked me for?")
    ).toBeInTheDocument()
    expect(screen.getByText("Grounded in 9 events for Anna")).toBeInTheDocument()
    expect(screen.getByText("86%")).toBeInTheDocument()
    expect(
      screen.getByText("Asked for clearer steps to reach the replay library.")
    ).toBeInTheDocument()
    expect(screen.getByText("imap")).toBeInTheDocument()
  })

  it("does not render a firewall notice when there is none", () => {
    render(<GroundedAnswer answer={baseAnswer} onFollowUp={() => {}} />)

    expect(screen.queryByText(/firewall/i)).not.toBeInTheDocument()
  })

  it("shows a firewall notice and marks sensitive sources", () => {
    render(
      <GroundedAnswer
        onFollowUp={() => {}}
        answer={{
          ...baseAnswer,
          firewall: "Kept out of this answer.",
          sources: [
            { ...baseAnswer.sources[0]!, snippet: "Sensitive detail", sensitive: true },
          ],
        }}
      />
    )

    expect(screen.getByText("Kept out of this answer.")).toBeInTheDocument()
    expect(
      screen.getByText("Sensitive detail").closest("[data-slot='source-cite']")
    ).toHaveAttribute("data-sensitive", "true")
  })

  it("fires onFollowUp when a follow-up chip is clicked", () => {
    const onFollowUp = vi.fn()
    render(<GroundedAnswer answer={baseAnswer} onFollowUp={onFollowUp} />)

    fireEvent.click(
      screen.getByRole("button", { name: /is anything sensitive\?/i })
    )

    expect(onFollowUp).toHaveBeenCalledWith("Is anything sensitive?")
  })

  it("fires onOpenSource with the cited source when a citation is clicked", () => {
    const onOpenSource = vi.fn()
    render(
      <GroundedAnswer
        answer={baseAnswer}
        onFollowUp={() => {}}
        onOpenSource={onOpenSource}
      />
    )

    fireEvent.click(screen.getByText("Anna Smith"))

    expect(onOpenSource).toHaveBeenCalledWith(baseAnswer.sources[0])
  })
})
