import type { Json } from "@/lib/database.types"

export type TimelineEventBodyBlock =
  | { kind: "text"; text: string }
  | { kind: "qa"; question: string; answer: string }

export type TimelineEventBody = {
  text: string
  blocks: TimelineEventBodyBlock[]
}

export const EMPTY_TIMELINE_EVENT_BODY: TimelineEventBody = {
  text: "",
  blocks: [],
}

export function createTextTimelineEventBody(text: string): TimelineEventBody {
  const normalized = text.trim()
  return {
    text: normalized,
    blocks: normalized ? [{ kind: "text", text: normalized }] : [],
  }
}

export function createQaTimelineEventBody(
  answers: Array<{ question: string; answer: string }>
): TimelineEventBody {
  const blocks = answers.flatMap(({ question, answer }) => {
    const normalizedQuestion = question.trim()
    const normalizedAnswer = answer.trim()
    return normalizedQuestion && normalizedAnswer
      ? [
          {
            kind: "qa" as const,
            question: normalizedQuestion,
            answer: normalizedAnswer,
          },
        ]
      : []
  })

  return {
    text: timelineEventBodyToText({ text: "", blocks }),
    blocks,
  }
}

export function normalizeTimelineEventBody(
  value: unknown
): TimelineEventBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const body = value as Record<string, unknown>
  if (typeof body.text !== "string" || !Array.isArray(body.blocks)) return null

  const blocks = body.blocks.map(normalizeTimelineEventBodyBlock)
  if (blocks.some((block) => block === null)) return null

  const normalizedBlocks = blocks as TimelineEventBodyBlock[]
  return {
    text: timelineEventBodyToText({
      text: body.text,
      blocks: normalizedBlocks,
    }),
    blocks: normalizedBlocks,
  }
}

export function isValidTimelineEventBody(
  value: unknown
): value is TimelineEventBody {
  return normalizeTimelineEventBody(value) !== null
}

export function timelineEventBodyFromJson(value: Json): TimelineEventBody {
  return normalizeTimelineEventBody(value) ?? EMPTY_TIMELINE_EVENT_BODY
}

export function timelineEventBodyToText(body: TimelineEventBody): string {
  if (body.blocks.length === 0) return body.text.trim()
  return body.blocks.map(timelineEventBodyBlockToText).join("\n")
}

function normalizeTimelineEventBodyBlock(
  value: unknown
): TimelineEventBodyBlock | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const block = value as Record<string, unknown>
  if (block.kind === "text" && typeof block.text === "string") {
    const text = block.text.trim()
    return text ? { kind: "text", text } : null
  }
  if (
    block.kind === "qa" &&
    typeof block.question === "string" &&
    typeof block.answer === "string"
  ) {
    const question = block.question.trim()
    const answer = block.answer.trim()
    return question && answer ? { kind: "qa", question, answer } : null
  }
  return null
}

function timelineEventBodyBlockToText(block: TimelineEventBodyBlock): string {
  if (block.kind === "text") return block.text
  return `${block.question}: ${block.answer}`
}
