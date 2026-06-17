import type {
  ClientProfile,
  ClientTimelineEvent,
} from "@/features/clients/domain/client-profile"
import { isSensitiveLevel } from "@/features/clients/domain/client-profile"
import { timelineEventBodyToText } from "@/features/clients/domain/timeline-event-body"
import type {
  GroundingContext,
  GroundingEvent,
  PartialAnswerDraft,
} from "@/features/ask/domain/answer-draft"
import type {
  AskSource,
  AskSourceIcon,
  GroundedAnswerData,
} from "@/features/ask/domain/grounded-answer"

const SNIPPET_MAX = 240
const MINUTE = 60
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const MONTH = 30 * DAY
const YEAR = 365 * DAY

/** First word of a name, falling back to the whole (trimmed) string. */
export function firstNameOf(name: string): string {
  return name.trim().split(/\s+/)[0] || name.trim()
}

/** Flatten a client's profile + timeline into the context the model reasons over. */
export function buildGroundingContext(
  client: ClientProfile,
  question: string
): GroundingContext {
  return {
    question,
    client: {
      name: client.displayName,
      email: client.primaryEmail,
      firstName: firstNameOf(client.displayName),
    },
    events: client.timeline.map(toGroundingEvent),
  }
}

function toGroundingEvent(event: ClientTimelineEvent): GroundingEvent {
  return {
    id: event.id,
    type: event.type,
    sourceType: event.sourceType,
    occurredAt: event.occurredAt,
    title: event.display.title,
    summary: event.display.summary,
    text: timelineEventBodyToText(event.body),
    sensitivityLevel: event.sensitivityLevel,
  }
}

/** Clamp a model-reported confidence to an integer 0–100; missing/NaN → 0. */
export function clampConfidence(value: number | undefined): number {
  if (typeof value !== "number" || Number.isNaN(value)) return 0
  return Math.min(100, Math.max(0, Math.round(value)))
}

/** "Grounded in N events for First" with pluralization. */
export function buildScope(firstName: string, eventCount: number): string {
  const noun = eventCount === 1 ? "event" : "events"
  return `Grounded in ${eventCount} ${noun} for ${firstName}`
}

const SOURCE_ICONS: Record<string, AskSourceIcon> = {
  email: "mail",
  sent: "sent",
  form: "form",
  csvimport: "form",
  note: "mail",
}

/** Citation icon for an event type, defaulting safely. */
export function mapSourceIcon(type: string): AskSourceIcon {
  return SOURCE_ICONS[type] ?? "mail"
}

const TYPE_LABELS: Record<string, string> = {
  email: "email",
  sent: "sent",
  form: "form",
  csvimport: "import",
  note: "note",
}

/** Prefer the connector source type for the chip label, else a type-based label. */
export function sourceLabelFor(event: {
  type: string
  sourceType: string | null
}): string {
  const sourceType = event.sourceType?.trim()
  if (sourceType) return sourceType
  return TYPE_LABELS[event.type] ?? event.type
}

/** Compact relative timestamp label, e.g. "now", "4h", "3d", "2w", "2mo". */
export function formatSourceWhen(fromISO: string, now: Date): string {
  const then = new Date(fromISO)
  if (Number.isNaN(then.getTime())) return ""

  const seconds = Math.max(0, Math.round((now.getTime() - then.getTime()) / 1000))
  if (seconds < MINUTE) return "now"
  if (seconds < HOUR) return `${Math.round(seconds / MINUTE)}m`
  if (seconds < DAY) return `${Math.round(seconds / HOUR)}h`
  if (seconds < WEEK) return `${Math.round(seconds / DAY)}d`
  if (seconds < MONTH) return `${Math.round(seconds / WEEK)}w`
  if (seconds < YEAR) return `${Math.round(seconds / MONTH)}mo`
  return `${Math.round(seconds / YEAR)}y`
}

/**
 * Rebuild a citation card per cited event ID from the REAL event. Unknown IDs
 * are dropped, so the model can never fabricate a source; the snippet falls back
 * to the event's own summary when the model omits one.
 */
export function reconstructSources(input: {
  citations: Array<{ eventId?: string; snippet?: string } | undefined> | undefined
  client: { name: string; email: string }
  events: GroundingEvent[]
  now: Date
}): AskSource[] {
  const byId = new Map(input.events.map((event) => [event.id, event]))
  const sources: AskSource[] = []

  for (const citation of input.citations ?? []) {
    if (!citation?.eventId) continue
    const event = byId.get(citation.eventId)
    if (!event) continue

    const snippet = citation.snippet?.trim()
    sources.push({
      name: input.client.name,
      email: input.client.email,
      sourceIcon: mapSourceIcon(event.type),
      sourceLabel: sourceLabelFor(event),
      when: formatSourceWhen(event.occurredAt, input.now),
      snippet: (snippet || event.summary).slice(0, SNIPPET_MAX),
      ...(isSensitiveLevel(event.sensitivityLevel) ? { sensitive: true } : {}),
    })
  }

  return sources
}

/**
 * Map a (possibly partial, mid-stream) model draft to the grounded answer the UI
 * renders. Tolerant of absent fields so the same function serves every partial.
 */
export function draftToGroundedAnswer(input: {
  question: string
  draft: PartialAnswerDraft
  context: GroundingContext
  now: Date
}): GroundedAnswerData {
  const { question, draft, context, now } = input
  return {
    question,
    lead: draft.lead ?? "",
    body: draft.body ?? "",
    scope: buildScope(context.client.firstName, context.events.length),
    confidencePct: clampConfidence(draft.confidence),
    sources: reconstructSources({
      citations: draft.citations,
      client: context.client,
      events: context.events,
      now,
    }),
    followUps: (draft.followUps ?? []).filter(
      (followUp): followUp is string =>
        typeof followUp === "string" && followUp.trim().length > 0
    ),
  }
}

/** A truthful answer for a client with no timeline events (no model call). */
export function emptyGroundedAnswer(input: {
  question: string
  context: GroundingContext
}): GroundedAnswerData {
  const first = input.context.client.firstName
  return {
    question: input.question,
    lead: `There's nothing on ${first}'s timeline yet to ground an answer.`,
    body: `Once ${first} has activity — emails, forms, or notes — I can answer here with cited sources.`,
    scope: buildScope(first, 0),
    confidencePct: 0,
    sources: [],
    followUps: [],
  }
}

/** Build the system + user prompt that constrains the model to the given events. */
export function buildGroundingPrompt(context: GroundingContext): {
  system: string
  user: string
} {
  const system = [
    `You answer questions about a single client (${context.client.name}), grounded ONLY in the timeline events provided below.`,
    `Never invent facts, people, dates, or events. If the events don't support an answer, say so plainly.`,
    `Cite supporting events ONLY by the exact [id] given — never invent an id. Each citation's snippet must be a short excerpt drawn from that event.`,
    `Write a concise markdown "lead" (one sentence, *italics* for emphasis) and a short "body" paragraph (**bold** for emphasis). Report a 0–100 confidence reflecting how well the events support the answer, and up to three natural follow-up questions.`,
  ].join("\n")

  const events = context.events
    .map(
      (event) =>
        `[${event.id}] ${event.type}${event.sourceType ? ` via ${event.sourceType}` : ""} on ${event.occurredAt}\nTitle: ${event.title}\n${event.text}`
    )
    .join("\n\n")

  const user = `Question: ${context.question}\n\nTimeline events:\n${events}`

  return { system, user }
}
