// The grounded-answer domain model for the "Ask AI" surface: a synthesized,
// citation-backed answer about one client. This is the shape the server streams
// to the UI and the UI renders. It carries no framework types — the AI SDK
// transport envelope lives in the application layer.

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
  /** Display name of the member who asked, for shared-thread attribution. */
  askedBy?: string
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
