import { describe, expect, it, vi } from "vitest"

import type { ClientProfile } from "@/features/clients/domain/client-profile"
import type { GroundedAnswerData } from "@/features/ask/application/client-ask"
import type { AskThreadTurn } from "@/features/ask/domain/ask-thread"
import type { ClientAskServerContext } from "@/features/ask/loaders"
import { handleClientAsk, handleClientAskClear } from "./route"

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

type StreamArgs = { history?: string; askedBy?: string | null }

function fakeContext(
  options: {
    client?: ClientProfile | null
    answers?: GroundedAnswerData[]
    priorTurns?: AskThreadTurn[]
    appendTurn?: ReturnType<typeof vi.fn>
    clearThread?: ReturnType<typeof vi.fn>
    streamSpy?: (args: StreamArgs) => void
  } = {}
): ClientAskServerContext {
  const {
    client = fakeClient(),
    answers = [ANSWER],
    priorTurns = [],
    appendTurn = vi.fn(async () => {}),
    clearThread = vi.fn(async () => {}),
    streamSpy,
  } = options
  return {
    workspaceId: "ws_1",
    askedBy: "Alex Bako",
    application: {
      loadClient: vi.fn(async () => client),
      async *streamGroundedAnswer(args: StreamArgs) {
        streamSpy?.(args)
        for (const answer of answers) yield answer
      },
    },
    threadReader: { listTurns: vi.fn(async () => priorTurns) },
    threadWriter: { appendTurn, clearThread },
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

  it("grounds the answer in prior turns and stamps the asker", async () => {
    const streamSpy = vi.fn()
    const context = fakeContext({
      streamSpy,
      priorTurns: [
        {
          id: "t1",
          question: "What has Anna asked for?",
          answer: { ...ANSWER, lead: "Mostly practical access." },
          askedBy: "Alex Bako",
          createdAt: "2026-06-18T09:00:00.000Z",
        },
      ],
    })

    const response = await handleClientAsk(
      askRequest("Is that sensitive?"),
      params(),
      { createContext: async () => context }
    )
    await response.text()

    expect(streamSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        history: expect.stringContaining("Mostly practical access."),
        askedBy: "Alex Bako",
      })
    )
  })

  it("persists the completed turn once after streaming", async () => {
    const appendTurn = vi.fn(async () => {})
    const response = await handleClientAsk(
      askRequest("What has Anna asked for?"),
      params(),
      { createContext: async () => fakeContext({ appendTurn }) }
    )
    await response.text()

    expect(appendTurn).toHaveBeenCalledTimes(1)
    expect(appendTurn).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      clientId: "client_1",
      question: "What has Anna asked for?",
      answer: ANSWER,
    })
  })

  it("still returns the answer when persistence fails", async () => {
    const appendTurn = vi.fn(async () => {
      throw new Error("db down")
    })
    const response = await handleClientAsk(
      askRequest("What has Anna asked for?"),
      params(),
      { createContext: async () => fakeContext({ appendTurn }) }
    )

    expect(response.ok).toBe(true)
    const body = await response.text()
    expect(body).toContain("Mostly practical access.")
  })
})

describe("handleClientAskClear", () => {
  it("returns 401 without an authenticated workspace", async () => {
    const response = await handleClientAskClear(params(), {
      createContext: async () => null,
    })
    expect(response.status).toBe(401)
  })

  it("returns 404 when the client is not in the workspace", async () => {
    const response = await handleClientAskClear(params(), {
      createContext: async () => fakeContext({ client: null }),
    })
    expect(response.status).toBe(404)
  })

  it("clears the thread scoped to the workspace + client and returns 204", async () => {
    const clearThread = vi.fn(async () => {})
    const response = await handleClientAskClear(params(), {
      createContext: async () => fakeContext({ clearThread }),
    })

    expect(response.status).toBe(204)
    expect(clearThread).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      clientId: "client_1",
    })
  })
})
