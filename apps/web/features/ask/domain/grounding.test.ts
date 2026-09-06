import { describe, expect, it } from "vitest"

import type { ClientProfile, ClientTimelineEvent } from "@/features/clients/domain/client-profile"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"
import type { GroundingContext, GroundingEvent } from "@/features/ask/domain/answer-draft"
import {
  buildGroundingContext,
  buildGroundingPrompt,
  clampConfidence,
  buildScope,
  draftToGroundedAnswer,
  emptyGroundedAnswer,
  firstNameOf,
  formatSourceWhen,
  mapSourceIcon,
  reconstructSources,
  sourceLabelFor,
} from "./grounding"

const NOW = new Date("2026-03-10T00:00:00.000Z")

function event(overrides: Partial<ClientTimelineEvent> = {}): ClientTimelineEvent {
  return {
    id: "evt_1",
    sourceId: "src_1",
    sourceType: "imap",
    type: "email",
    occurredAt: "2026-03-08T00:00:00.000Z",
    display: { title: "Replay access", summary: "Asked for clearer steps to the replay library." },
    body: createTextTimelineEventBody("Hi, how do I reach the replay library?"),
    sensitivityLevel: 0,
    parentEventId: null,
    author: null,
    ...overrides,
  }
}

function profile(overrides: Partial<ClientProfile> = {}): ClientProfile {
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
    timeline: [event()],
    properties: [],
    attributes: [],
    sourceIds: [],
    ...overrides,
  }
}

function context(events: GroundingEvent[]): GroundingContext {
  return {
    question: "What has Anna asked for?",
    client: { name: "Anna Smith", email: "anna@example.com", firstName: "Anna" },
    events,
  }
}

const groundingEvent = (overrides: Partial<GroundingEvent> = {}): GroundingEvent => ({
  id: "evt_1",
  type: "email",
  sourceType: "imap",
  occurredAt: "2026-03-08T00:00:00.000Z",
  title: "Replay access",
  summary: "Asked for clearer steps to the replay library.",
  text: "Hi, how do I reach the replay library?",
  sensitivityLevel: 0,
  ...overrides,
})

describe("firstNameOf", () => {
  it("returns the first word, falling back to the whole string", () => {
    expect(firstNameOf("Anna Smith")).toBe("Anna")
    expect(firstNameOf("  Bob  ")).toBe("Bob")
    expect(firstNameOf("")).toBe("")
  })
})

describe("buildGroundingContext", () => {
  it("flattens the client's timeline into grounding events with full body text", () => {
    const ctx = buildGroundingContext(profile(), "What has Anna asked for?")

    expect(ctx.question).toBe("What has Anna asked for?")
    expect(ctx.client).toEqual({
      name: "Anna Smith",
      email: "anna@example.com",
      firstName: "Anna",
    })
    expect(ctx.events).toHaveLength(1)
    expect(ctx.events[0]).toMatchObject({
      id: "evt_1",
      type: "email",
      sourceType: "imap",
      title: "Replay access",
      text: "Hi, how do I reach the replay library?",
      sensitivityLevel: 0,
    })
  })
})

describe("clampConfidence", () => {
  it("clamps to 0-100 and rounds, defaulting missing to 0", () => {
    expect(clampConfidence(86.4)).toBe(86)
    expect(clampConfidence(150)).toBe(100)
    expect(clampConfidence(-5)).toBe(0)
    expect(clampConfidence(undefined)).toBe(0)
    expect(clampConfidence(Number.NaN)).toBe(0)
  })
})

describe("buildScope", () => {
  it("describes how many events ground the answer, with pluralization", () => {
    expect(buildScope("Anna", 9)).toBe("Grounded in 9 events for Anna")
    expect(buildScope("Anna", 1)).toBe("Grounded in 1 event for Anna")
    expect(buildScope("Anna", 0)).toBe("Grounded in 0 events for Anna")
  })
})

describe("mapSourceIcon", () => {
  it("maps event types to citation icons with a safe default", () => {
    expect(mapSourceIcon("email")).toBe("mail")
    expect(mapSourceIcon("sent")).toBe("sent")
    expect(mapSourceIcon("form")).toBe("form")
    expect(mapSourceIcon("csvimport")).toBe("form")
    expect(mapSourceIcon("note")).toBe("mail")
    expect(mapSourceIcon("unknown")).toBe("mail")
  })
})

describe("sourceLabelFor", () => {
  it("prefers the connector source type, else a type-based label", () => {
    expect(sourceLabelFor({ type: "email", sourceType: "imap" })).toBe("imap")
    expect(sourceLabelFor({ type: "form", sourceType: null })).toBe("form")
    expect(sourceLabelFor({ type: "sent", sourceType: null })).toBe("sent")
    expect(sourceLabelFor({ type: "csvimport", sourceType: "  " })).toBe("import")
  })
})

describe("formatSourceWhen", () => {
  it("produces compact relative labels", () => {
    expect(formatSourceWhen("2026-03-10T00:00:00.000Z", NOW)).toBe("now")
    expect(formatSourceWhen("2026-03-09T20:00:00.000Z", NOW)).toBe("4h")
    expect(formatSourceWhen("2026-03-07T00:00:00.000Z", NOW)).toBe("3d")
    expect(formatSourceWhen("2026-02-24T00:00:00.000Z", NOW)).toBe("2w")
    expect(formatSourceWhen("2026-01-09T00:00:00.000Z", NOW)).toBe("2mo")
    expect(formatSourceWhen("not-a-date", NOW)).toBe("")
  })
})

describe("reconstructSources", () => {
  it("builds a source per citation from the real event", () => {
    const sources = reconstructSources({
      citations: [{ eventId: "evt_1", snippet: "reach the replay library" }],
      client: { name: "Anna Smith", email: "anna@example.com" },
      events: [groundingEvent()],
      now: NOW,
    })

    expect(sources).toEqual([
      {
        name: "Anna Smith",
        email: "anna@example.com",
        sourceIcon: "mail",
        sourceLabel: "imap",
        when: "2d",
        snippet: "reach the replay library",
      },
    ])
  })

  it("drops citations whose event id is unknown (never fabricates)", () => {
    const sources = reconstructSources({
      citations: [{ eventId: "ghost", snippet: "made up" }, { eventId: "evt_1" }],
      client: { name: "Anna Smith", email: "anna@example.com" },
      events: [groundingEvent()],
      now: NOW,
    })

    expect(sources).toHaveLength(1)
    expect(sources[0]?.snippet).toBe("Asked for clearer steps to the replay library.")
  })

  it("falls back to the event summary when the model omits a snippet", () => {
    const sources = reconstructSources({
      citations: [{ eventId: "evt_1", snippet: "   " }],
      client: { name: "Anna Smith", email: "anna@example.com" },
      events: [groundingEvent()],
      now: NOW,
    })

    expect(sources[0]?.snippet).toBe("Asked for clearer steps to the replay library.")
  })

  it("marks sensitive events", () => {
    const sources = reconstructSources({
      citations: [{ eventId: "evt_1", snippet: "x" }],
      client: { name: "Anna Smith", email: "anna@example.com" },
      events: [groundingEvent({ sensitivityLevel: 3 })],
      now: NOW,
    })

    expect(sources[0]?.sensitive).toBe(true)
  })

  it("tolerates a missing citations array", () => {
    expect(
      reconstructSources({
        citations: undefined,
        client: { name: "Anna Smith", email: "anna@example.com" },
        events: [groundingEvent()],
        now: NOW,
      })
    ).toEqual([])
  })
})

describe("draftToGroundedAnswer", () => {
  it("assembles a complete grounded answer, clamping confidence and dropping empty follow-ups", () => {
    const ctx = context([groundingEvent(), groundingEvent({ id: "evt_2" })])
    const answer = draftToGroundedAnswer({
      question: "What has Anna asked for?",
      draft: {
        lead: "Mostly *practical access*.",
        body: "She asks about **logistics**.",
        confidence: 120,
        citations: [{ eventId: "evt_1", snippet: "replay library" }],
        followUps: ["Draft a reply", "", undefined],
      },
      context: ctx,
      now: NOW,
    })

    expect(answer).toMatchObject({
      question: "What has Anna asked for?",
      lead: "Mostly *practical access*.",
      body: "She asks about **logistics**.",
      confidencePct: 100,
      scope: "Grounded in 2 events for Anna",
      followUps: ["Draft a reply"],
    })
    expect(answer.sources).toHaveLength(1)
  })

  it("tolerates a partial draft (mid-stream) with absent fields", () => {
    const answer = draftToGroundedAnswer({
      question: "What has Anna asked for?",
      draft: { lead: "Mostly" },
      context: context([groundingEvent()]),
      now: NOW,
    })

    expect(answer.lead).toBe("Mostly")
    expect(answer.body).toBe("")
    expect(answer.confidencePct).toBe(0)
    expect(answer.sources).toEqual([])
    expect(answer.followUps).toEqual([])
  })
})

describe("emptyGroundedAnswer", () => {
  it("returns a truthful empty answer with no sources and low confidence", () => {
    const answer = emptyGroundedAnswer({
      question: "What has Anna asked for?",
      context: context([]),
    })

    expect(answer.question).toBe("What has Anna asked for?")
    expect(answer.sources).toEqual([])
    expect(answer.followUps).toEqual([])
    expect(answer.confidencePct).toBe(0)
    expect(answer.scope).toBe("Grounded in 0 events for Anna")
    expect(answer.lead.length).toBeGreaterThan(0)
  })
})

describe("buildGroundingPrompt", () => {
  it("includes the question and every event id, and forbids inventing citations", () => {
    const ctx = context([groundingEvent({ id: "evt_1" }), groundingEvent({ id: "evt_2" })])
    const { system, user } = buildGroundingPrompt(ctx)

    expect(user).toContain("What has Anna asked for?")
    expect(user).toContain("evt_1")
    expect(user).toContain("evt_2")
    expect(`${system} ${user}`.toLowerCase()).toContain("only")
  })

  it("omits the conversation section when there is no history", () => {
    const { system, user } = buildGroundingPrompt(context([groundingEvent()]))

    expect(user).not.toContain("Conversation so far")
    expect(system).not.toContain("Earlier turns")
  })

  it("adds a conversation section and reference-only instruction when history is present", () => {
    const ctx: GroundingContext = {
      ...context([groundingEvent()]),
      history: "Q: What has Anna asked for?\nA: Mostly practical access.",
    }
    const { system, user } = buildGroundingPrompt(ctx)

    expect(user).toContain("Conversation so far")
    expect(user).toContain("Mostly practical access.")
    // Still demands grounding + citations for new claims.
    expect(system).toContain("Earlier turns")
    expect(system.toLowerCase()).toContain("grounded in the timeline")
  })
})

describe("buildGroundingContext history", () => {
  it("carries a trimmed history when provided and omits it when blank", () => {
    expect(buildGroundingContext(profile(), "Q", "  prior  ").history).toBe("prior")
    expect(buildGroundingContext(profile(), "Q", "   ").history).toBeUndefined()
    expect(buildGroundingContext(profile(), "Q").history).toBeUndefined()
  })
})

describe("askedBy stamping", () => {
  it("stamps askedBy onto a grounded answer when provided", () => {
    const answer = draftToGroundedAnswer({
      question: "Q",
      draft: { lead: "Lead", body: "Body", confidence: 50, citations: [], followUps: [] },
      context: context([groundingEvent()]),
      now: NOW,
      askedBy: "Alex Bako",
    })
    expect(answer.askedBy).toBe("Alex Bako")
  })

  it("leaves askedBy unset when not provided", () => {
    const answer = draftToGroundedAnswer({
      question: "Q",
      draft: { lead: "Lead", body: "Body", confidence: 50, citations: [], followUps: [] },
      context: context([groundingEvent()]),
      now: NOW,
    })
    expect(answer.askedBy).toBeUndefined()
  })

  it("stamps askedBy onto the empty answer too", () => {
    const answer = emptyGroundedAnswer({
      question: "Q",
      context: context([]),
      askedBy: "Alex Bako",
    })
    expect(answer.askedBy).toBe("Alex Bako")
  })
})
