import { describe, expect, it } from "vitest"

import {
  buildEmailMessageFacts,
  ownerEmailSet,
  type ParsedMailLike,
} from "@/features/data-sources/email/email-message-facts"

const FALLBACK = new Date("2026-01-01T00:00:00.000Z")
const OWNER = ownerEmailSet("owner@example.com", [])

function build(parsed: ParsedMailLike, overrides: Partial<Parameters<typeof buildEmailMessageFacts>[0]> = {}) {
  return buildEmailMessageFacts({
    parsed,
    ownerEmails: OWNER,
    skipSenders: [],
    manualReviewKeywords: [],
    fallbackDate: FALLBACK,
    ...overrides,
  })
}

describe("buildEmailMessageFacts", () => {
  it("classifies an inbound message and derives a canonical externalId", () => {
    const result = build({
      messageId: "<abc@mail.example.com>",
      subject: "Hello",
      text: "hi there",
      date: new Date("2026-02-02T10:00:00.000Z"),
      from: { value: [{ address: "client@acme.test", name: "Client" }] },
      to: { value: [{ address: "owner@example.com" }] },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.facts.eventType).toBe("email_received")
    expect(result.facts.externalId).toBe("message:<abc@mail.example.com>")
    expect(result.facts.occurredAt).toBe("2026-02-02T10:00:00.000Z")
    expect(result.facts.participants).toEqual([
      { email: "client@acme.test", name: "Client", role: "external" },
    ])
  })

  it("classifies an outbound message as email_sent when the sender is an owner", () => {
    const result = build({
      messageId: "<out@example.com>",
      from: { value: [{ address: "owner@example.com" }] },
      to: { value: [{ address: "client@acme.test" }] },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.facts.eventType).toBe("email_sent")
  })

  it("returns null externalId when the message has no Message-ID (provider supplies fallback)", () => {
    const result = build({
      from: { value: [{ address: "client@acme.test" }] },
      to: { value: [{ address: "owner@example.com" }] },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.facts.externalId).toBeNull()
    expect(result.facts.occurredAt).toBe(FALLBACK.toISOString())
  })

  it("skips messages whose sender matches a skip-sender pattern", () => {
    const result = build(
      {
        from: { value: [{ address: "noreply@acme.test" }] },
        to: { value: [{ address: "owner@example.com" }] },
      },
      { skipSenders: ["noreply@*"] }
    )

    expect(result).toEqual({ ok: false, reason: "skip_sender" })
  })

  it("rejects messages with no external participant", () => {
    const result = build({
      from: { value: [{ address: "owner@example.com" }] },
      to: { value: [{ address: "owner@example.com" }] },
    })

    expect(result).toEqual({ ok: false, reason: "no_external_participant" })
  })

  it("deduplicates external participants across from/to/cc and excludes owners", () => {
    const result = build({
      from: { value: [{ address: "client@acme.test", name: "Client" }] },
      to: { value: [{ address: "owner@example.com" }, { address: "client@acme.test" }] },
      cc: { value: [{ address: "second@acme.test" }] },
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.facts.participants.map((p) => p.email)).toEqual([
      "client@acme.test",
      "second@acme.test",
    ])
  })

  it("surfaces manual-review keyword matches in sensitivity facts", () => {
    const result = build(
      {
        subject: "Urgent refund request",
        text: "please process the refund",
        from: { value: [{ address: "client@acme.test" }] },
        to: { value: [{ address: "owner@example.com" }] },
      },
      { manualReviewKeywords: ["refund"] }
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.facts.matchedSensitivityKeywords).toContain("refund")
    expect(result.facts.sensitivityLevel).toBeGreaterThan(0)
  })
})
