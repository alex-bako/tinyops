import { z } from "zod"

// The structured output we ask the model to produce, and the typed context we
// feed it. Citations reference event IDs we put in the prompt; the grounding
// layer reconstructs the real `AskSource` from those IDs, so a citation can
// never be fabricated — at worst an unknown ID is dropped.

export const askCitationSchema = z.object({
  eventId: z.string().describe("ID of a timeline event provided in the prompt"),
  snippet: z
    .string()
    .describe("Short excerpt from that event that supports the answer"),
})

export const askAnswerDraftSchema = z.object({
  lead: z
    .string()
    .describe("One-sentence markdown headline answer; use *italics* for emphasis"),
  body: z
    .string()
    .describe("A short supporting markdown paragraph; use **bold** for emphasis"),
  confidence: z
    .number()
    .describe("0-100 confidence in the answer given the available events"),
  citations: z
    .array(askCitationSchema)
    .describe("The events that ground the answer; use ONLY the provided event IDs"),
  followUps: z
    .array(z.string())
    .describe("Up to three natural follow-up questions the user might ask next"),
})

export type AskCitation = z.infer<typeof askCitationSchema>
export type AnswerDraft = z.infer<typeof askAnswerDraftSchema>

/**
 * The AI SDK's `partialObjectStream` yields deep-partial drafts as tokens
 * arrive, so every field — and every array element — can be momentarily absent.
 */
export type PartialAnswerDraft = {
  lead?: string
  body?: string
  confidence?: number
  citations?: Array<Partial<AskCitation> | undefined>
  followUps?: Array<string | undefined>
}

/** One timeline event, flattened to what the model needs to reason and cite. */
export type GroundingEvent = {
  id: string
  /** Domain event kind ("email" | "sent" | "form" | "csvimport" | "note"). */
  type: string
  /** Connector source type when known, e.g. "imap", "google_forms". */
  sourceType: string | null
  occurredAt: string
  title: string
  /** Short, display-ready summary — the citation snippet fallback. */
  summary: string
  /** Full body text the model reasons over. */
  text: string
  sensitivityLevel: number
}

export type GroundingClient = {
  name: string
  email: string
  firstName: string
}

/** Everything the synthesizer needs: the question, the client, and the events. */
export type GroundingContext = {
  question: string
  client: GroundingClient
  events: GroundingEvent[]
}

/** A streaming synthesis: progressive partials plus the resolved final draft. */
export type AnswerSynthesis = {
  partials: AsyncIterable<PartialAnswerDraft>
  final: Promise<AnswerDraft>
}

/** Port the application calls to turn grounding context into a model answer. */
export type AnswerSynthesizerPort = {
  synthesize(context: GroundingContext): AnswerSynthesis
}
