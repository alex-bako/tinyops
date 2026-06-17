import { simulateReadableStream } from "ai"
import { MockLanguageModelV3 } from "ai/test"
import { afterEach, describe, expect, it } from "vitest"

import type { GroundingContext } from "@/features/ask/domain/answer-draft"
import {
  createOpenAiAnswerSynthesizer,
  resolveAskModel,
} from "./openai-answer-synthesizer"

function context(): GroundingContext {
  return {
    question: "What has Anna asked for?",
    client: { name: "Anna Smith", email: "anna@example.com", firstName: "Anna" },
    events: [
      {
        id: "evt_1",
        type: "email",
        sourceType: "imap",
        occurredAt: "2026-03-08T00:00:00.000Z",
        title: "Replay access",
        summary: "Asked for replay steps.",
        text: "How do I reach the replay library?",
        sensitivityLevel: 0,
      },
    ],
  }
}

const DRAFT = {
  lead: "Mostly *practical access*.",
  body: "She asks about **logistics**.",
  confidence: 86,
  citations: [{ eventId: "evt_1", snippet: "replay library" }],
  followUps: ["Draft a reply"],
}

function mockModel(onPrompt?: (prompt: unknown) => void) {
  const json = JSON.stringify(DRAFT)
  return new MockLanguageModelV3({
    doStream: async (options) => {
      onPrompt?.(options.prompt)
      return {
        stream: simulateReadableStream({
          chunks: [
            { type: "stream-start", warnings: [] },
            { type: "text-start", id: "1" },
            { type: "text-delta", id: "1", delta: json.slice(0, 20) },
            { type: "text-delta", id: "1", delta: json.slice(20) },
            { type: "text-end", id: "1" },
            {
              type: "finish",
              finishReason: { unified: "stop" as const, raw: "stop" },
              usage: {
                inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
                outputTokens: { total: 1, text: 1, reasoning: 0 },
              },
            },
          ],
        }),
      }
    },
  })
}

describe("resolveAskModel", () => {
  const original = process.env.ASK_AI_MODEL
  afterEach(() => {
    if (original === undefined) delete process.env.ASK_AI_MODEL
    else process.env.ASK_AI_MODEL = original
  })

  it("defaults to gpt-5.5 and honors the ASK_AI_MODEL override", () => {
    delete process.env.ASK_AI_MODEL
    expect(resolveAskModel()).toBe("gpt-5.5")

    process.env.ASK_AI_MODEL = "openai/gpt-4o"
    expect(resolveAskModel()).toBe("openai/gpt-4o")
  })
})

describe("createOpenAiAnswerSynthesizer", () => {
  it("streams partial drafts and resolves the final validated draft", async () => {
    const synthesizer = createOpenAiAnswerSynthesizer({ model: mockModel() })

    const synthesis = synthesizer.synthesize(context())
    const partials = []
    for await (const partial of synthesis.partials) partials.push(partial)
    const final = await synthesis.final

    expect(partials.length).toBeGreaterThan(0)
    expect(final).toEqual(DRAFT)
  })

  it("forwards the grounded prompt (question + event ids) to the model", async () => {
    let captured: unknown
    const synthesizer = createOpenAiAnswerSynthesizer({
      model: mockModel((prompt) => {
        captured = prompt
      }),
    })

    const synthesis = synthesizer.synthesize(context())
    for await (const _ of synthesis.partials) void _
    await synthesis.final

    const serialized = JSON.stringify(captured)
    expect(serialized).toContain("What has Anna asked for?")
    expect(serialized).toContain("evt_1")
  })
})
