import { describe, expect, it } from "vitest"

import {
  askExampleQuestions,
  resolveGroundedAnswer,
} from "./client-ask-fixtures"

const ctx = { clientName: "Anna Smith", clientEmail: "anna@example.com" }

describe("askExampleQuestions", () => {
  it("templates the example questions with the client's first name", () => {
    const questions = askExampleQuestions("Anna Smith")

    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every((q) => q.includes("Anna"))).toBe(true)
  })
})

describe("resolveGroundedAnswer", () => {
  it("answers a 'what has X asked for' question, grounded in that client", () => {
    const answer = resolveGroundedAnswer({
      ...ctx,
      question: "What has Anna actually asked me for?",
    })

    expect(answer.question).toBe("What has Anna actually asked me for?")
    expect(answer.scope).toContain("Anna")
    expect(answer.sources.length).toBeGreaterThan(0)
    expect(answer.sources[0]?.email).toBe("anna@example.com")
    expect(answer.firewall).toBeUndefined()
  })

  it("flags a firewall and a sensitive source for a sensitivity question", () => {
    const answer = resolveGroundedAnswer({
      ...ctx,
      question: "Is anything in Anna's history sensitive?",
    })

    expect(answer.firewall).toBeTruthy()
    expect(answer.sources.some((s) => s.sensitive)).toBe(true)
  })

  it("falls back to a default answer that echoes an unknown question", () => {
    const answer = resolveGroundedAnswer({
      ...ctx,
      question: "What colour is the sky?",
    })

    expect(answer.question).toBe("What colour is the sky?")
    expect(answer.sources.length).toBeGreaterThan(0)
  })
})
