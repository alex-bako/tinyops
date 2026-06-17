import { describe, expect, it, vi } from "vitest"

import type { ClientProfile } from "@/features/clients/domain/client-profile"
import type { GroundedAnswerData } from "@/features/ask/application/client-ask"
import type { ClientAskServerContext } from "@/features/ask/loaders"
import { handleClientAsk } from "./route"

const ANSWER: GroundedAnswerData = {
  question: "What has Anna asked for?",
  lead: "Mostly practical access.",
  body: "Logistics.",
  scope: "Grounded in 1 event for Anna",
  confidencePct: 86,
  sources: [],
  followUps: [],
}

function fakeClient(): ClientProfile {
  return { id: "client_1", slug: "anna-smith", displayName: "Anna Smith" } as ClientProfile
}

function fakeContext(
  options: {
    client?: ClientProfile | null
    answers?: GroundedAnswerData[]
  } = {}
): ClientAskServerContext {
  const { client = fakeClient(), answers = [ANSWER] } = options
  return {
    application: {
      loadClient: vi.fn(async () => client),
      async *streamGroundedAnswer() {
        for (const answer of answers) yield answer
      },
    },
  } as unknown as ClientAskServerContext
}

function askRequest(question: string) {
  return new Request("http://localhost/api/clients/anna-smith/ask", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      messages: question
        ? [{ id: "u1", role: "user", parts: [{ type: "text", text: question }] }]
        : [],
    }),
  })
}

const params = () => Promise.resolve({ slug: "anna-smith" })

describe("handleClientAsk", () => {
  it("returns 401 when there is no authenticated workspace context", async () => {
    const response = await handleClientAsk(askRequest("hi"), params(), {
      createContext: async () => null,
    })
    expect(response.status).toBe(401)
  })

  it("returns 404 when the client is not in the workspace", async () => {
    const response = await handleClientAsk(askRequest("hi"), params(), {
      createContext: async () => fakeContext({ client: null }),
    })
    expect(response.status).toBe(404)
  })

  it("returns 422 when the question is empty", async () => {
    const response = await handleClientAsk(askRequest(""), params(), {
      createContext: async () => fakeContext(),
    })
    expect(response.status).toBe(422)
  })

  it("streams the grounded answer as a data-answer part", async () => {
    const response = await handleClientAsk(
      askRequest("What has Anna asked for?"),
      params(),
      { createContext: async () => fakeContext() }
    )

    expect(response.ok).toBe(true)
    expect(response.headers.get("content-type")).toContain("text/event-stream")

    const body = await response.text()
    expect(body).toContain("Mostly practical access.")
    expect(body).toContain("Grounded in 1 event for Anna")
  })
})
