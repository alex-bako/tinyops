import type { UIMessage } from "ai"

// Contract for the client-scoped "Ask AI" surface. This is the application-layer
// port between the UI and the grounding backend: the server streams a
// `GroundedAnswerData` to the client as a typed `data-answer` message part, and
// the UI renders it. Swapping the mocked adapter for a real grounding use-case
// changes only the adapter + route — these types and every component stay put.

/** Source kinds we know how to badge in a citation chip. */
export type AskSourceIcon = "mail" | "form" | "sent" | "course" | "payment"

/** One cited event behind an answer, shown as a rich citation card. */
export type AskSource = {
  name: string
  email: string
  sourceIcon: AskSourceIcon
  /** Free-text chip label, e.g. "imap", "intake form", "sent". */
  sourceLabel: string
  /** Relative/absolute timestamp label, e.g. "Mar 8", "3d". */
  when: string
  snippet: string
  /** Sensitive events render in the care/coral tone. */
  sensitive?: boolean
}

/** A synthesized, grounded answer. `lead`/`body` are markdown. */
export type GroundedAnswerData = {
  question: string
  lead: string
  body: string
  /** e.g. "Grounded in 9 events for Anna". */
  scope: string
  /** 0–100. */
  confidencePct: number
  /** Optional coral notice when sensitive content was kept out of the answer. */
  firewall?: string
  sources: AskSource[]
  followUps: string[]
}

/** Typed AI SDK data parts carried on the assistant message. */
export type AskDataParts = {
  answer: GroundedAnswerData
}

export type AskMessage = UIMessage<never, AskDataParts>

/**
 * Extra context the client posts alongside the chat messages so the grounding
 * backend can scope and attribute the answer to the open client.
 */
export type AskRequestContext = {
  clientName: string
  clientEmail: string
}
