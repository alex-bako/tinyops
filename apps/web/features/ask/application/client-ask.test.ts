import { describe, expect, it, vi } from "vitest"

import type {
  ClientProfile,
  ClientReaderPort,
  ClientTimelineEvent,
} from "@/features/clients/domain/client-profile"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"
import type {
  AnswerDraft,
  AnswerSynthesizerPort,
  GroundingContext,
  PartialAnswerDraft,
} from "@/features/ask/domain/answer-draft"
import type { AskThreadTurn } from "@/features/ask/domain/ask-thread"
import type { GroundedAnswerData } from "@/features/ask/domain/grounded-answer"
import { askThreadToMessages, createClientAskApplication } from "./client-ask"

const NOW = () => new Date("2026-03-10T00:00:00.000Z")

function event(overrides: Partial<ClientTimelineEvent> = {}): ClientTimelineEvent {
  return {
    id: "evt_1",
    sourceId: "src_1",
    sourceType: "imap",
    type: "email",
    occurredAt: "2026-03-08T00:00:00.000Z",
    display: { title: "Replay access", summary: "Asked for replay steps." },
    body: createTextTimelineEventBody("How do I reach the replay library?"),
    sensitivityLevel: 0,
    parentEventId: null,
    author: null,
    ...overrides,
  }
}

function profile(timeline: ClientTimelineEvent[]): ClientProfile {
  return {
    id: "client_1",
    workspaceId: "ws_1",
    primaryEmail: "anna@example.com",
    displayName: "Anna Smith",
    slug: "anna-smith",
    status: "active",
    tags: [],
    firstSeenAt: null,
    lastSeenAt: null,
    lastContactedAt: null,
    doNotContact: false,
    unsubscribeStatus: "subscribed",
    consentStatus: "unknown",
    sensitivityLevel: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    timeline,
    properties: [],
  }
}

function fakeReader(client: ClientProfile | null): ClientReaderPort {
  return {
    listClients: vi.fn(async () => []),
    getRecentClients: vi.fn(async () => []),
    findClientBySlug: vi.fn(async () => client),
    searchClients: vi.fn(async () => []),
  }
}

async function* asyncIterable<T>(items: T[]): AsyncGenerator<T> {
  for (const item of items) yield item
}

function fakeSynthesizer(
  partials: PartialAnswerDraft[],
  final: AnswerDraft
): AnswerSynthesizerPort & { lastContext: GroundingContext | null } {
  const port = {
    lastContext: null as GroundingContext | null,
    synthesize: vi.fn((context: GroundingContext) => {
      port.lastContext = context
      return { partials: asyncIterable(partials), final: Promise.resolve(final) }
    }),
  }
  return port
}

describe("createClientAskApplication", () => {
  it("loadClient delegates to the reader scoped by workspace", async () => {
    const reader = fakeReader(profile([event()]))
    const synthesizer = fakeSynthesizer([], blankDraft())
    const app = createClientAskApplication({ workspaceId: "ws_1", reader, synthesizer, now: NOW })

    await app.loadClient("anna-smith")

    expect(reader.findClientBySlug).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      slug: "anna-smith",
    })
  })

  it("streams progressive grounded answers, ending with reconstructed sources", async () => {
    const reader = fakeReader(profile([event()]))
    const final: AnswerDraft = {
      lead: "Mostly *practical access*.",
      body: "She asks about **logistics**.",
      confidence: 86,
      citations: [{ eventId: "evt_1", snippet: "reach the replay library" }],
      followUps: ["Draft a reply about replay access"],
    }
    const synthesizer = fakeSynthesizer(
      [{ lead: "Mostly" }, { lead: "Mostly *practical access*.", confidence: 86 }],
      final
    )
    const app = createClientAskApplication({ workspaceId: "ws_1", reader, synthesizer, now: NOW })

    const yielded = []
    for await (const answer of app.streamGroundedAnswer({
      client: profile([event()]),
      question: "What has Anna asked for?",
    })) {
      yielded.push(answer)
    }

    // two partials + the final
    expect(yielded).toHaveLength(3)
    expect(yielded[0]).toMatchObject({ lead: "Mostly", confidencePct: 0, sources: [] })
    expect(yielded[2]).toMatchObject({
      lead: "Mostly *practical access*.",
      body: "She asks about **logistics**.",
      confidencePct: 86,
      scope: "Grounded in 1 event for Anna",
    })
    expect(yielded[2]?.sources).toHaveLength(1)
    expect(yielded[2]?.sources[0]).toMatchObject({ snippet: "reach the replay library", when: "2d" })
    expect(synthesizer.lastContext?.events).toHaveLength(1)
    expect(synthesizer.lastContext?.question).toBe("What has Anna asked for?")
  })

  it("passes history into the grounding context and stamps askedBy onto answers", async () => {
    const reader = fakeReader(profile([event()]))
    const synthesizer = fakeSynthesizer([{ lead: "Mid" }], blankDraft())
    const app = createClientAskApplication({ workspaceId: "ws_1", reader, synthesizer, now: NOW })

    const yielded = []
    for await (const answer of app.streamGroundedAnswer({
      client: profile([event()]),
      question: "And is that sensitive?",
      history: "Q: What has Anna asked for?\nA: Mostly practical access.",
      askedBy: "Alex Bako",
    })) {
      yielded.push(answer)
    }

    expect(synthesizer.lastContext?.history).toBe(
      "Q: What has Anna asked for?\nA: Mostly practical access."
    )
    expect(yielded.every((answer) => answer.askedBy === "Alex Bako")).toBe(true)
  })

  it("short-circuits a grounded empty answer for a client with no events, never calling the model", async () => {
    const reader = fakeReader(profile([]))
    const synthesizer = fakeSynthesizer([], blankDraft())
    const app = createClientAskApplication({ workspaceId: "ws_1", reader, synthesizer, now: NOW })

    const yielded = []
    for await (const answer of app.streamGroundedAnswer({
      client: profile([]),
      question: "What has Anna asked for?",
    })) {
      yielded.push(answer)
    }

    expect(yielded).toHaveLength(1)
    expect(yielded[0]?.sources).toEqual([])
    expect(yielded[0]?.lead.length).toBeGreaterThan(0)
    expect(synthesizer.synthesize).not.toHaveBeenCalled()
  })
})

function blankDraft(): AnswerDraft {
  return { lead: "", body: "", confidence: 0, citations: [], followUps: [] }
}

describe("askThreadToMessages", () => {
  const answer: GroundedAnswerData = {
    question: "What has Anna asked for?",
    lead: "Mostly practical access.",
    body: "Logistics.",
    scope: "Grounded in 1 event for Anna",
    confidencePct: 86,
    sources: [],
    followUps: ["Is anything sensitive?"],
  }

  function turn(overrides: Partial<AskThreadTurn> = {}): AskThreadTurn {
    return {
      id: "t1",
      question: "What has Anna asked for?",
      answer,
      askedBy: "Alex Bako",
      createdAt: "2026-06-18T10:00:00.000Z",
      ...overrides,
    }
  }

  it("reconstructs a user question + assistant answer per turn, asker stamped", () => {
    const messages = askThreadToMessages([turn()])

    expect(messages).toHaveLength(2)
    expect(messages[0]).toMatchObject({
      role: "user",
      parts: [{ type: "text", text: "What has Anna asked for?" }],
    })
    expect(messages[1]?.role).toBe("assistant")
    const part = messages[1]?.parts[0]
    expect(part?.type).toBe("data-answer")
    expect(part && "data" in part ? part.data.askedBy : null).toBe("Alex Bako")
  })

  it("preserves order across turns with stable, unique message ids", () => {
    const messages = askThreadToMessages([
      turn({ id: "t1", question: "Q1" }),
      turn({ id: "t2", question: "Q2" }),
    ])

    expect(messages.map((message) => message.id)).toEqual(["t1-q", "t1-a", "t2-q", "t2-a"])
  })
})
