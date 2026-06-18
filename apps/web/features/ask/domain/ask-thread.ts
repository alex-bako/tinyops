import type { GroundedAnswerData } from "@/features/ask/domain/grounded-answer"

// The persisted "Ask AI" thread: one shared, ongoing conversation per client.
// Each turn is a question plus its grounded answer. The reader hydrates the UI
// and grounds context-aware follow-ups; the writer appends completed turns and
// clears the thread. No framework/DB types leak in here — adapters map rows.

/** One persisted Q&A turn in a client's shared Ask thread. */
export type AskThreadTurn = {
  id: string
  question: string
  answer: GroundedAnswerData
  /** Display name of the member who asked, for shared-thread attribution. */
  askedBy: string | null
  /** ISO timestamp; turns are ordered oldest-first. */
  createdAt: string
}

/** Reads the shared thread for a client, oldest turn first. */
export type AskThreadReaderPort = {
  listTurns(input: {
    workspaceId: string
    clientId: string
  }): Promise<AskThreadTurn[]>
}

/** Appends completed turns and clears the whole thread. */
export type AskThreadWriterPort = {
  appendTurn(input: {
    workspaceId: string
    clientId: string
    question: string
    answer: GroundedAnswerData
  }): Promise<void>
  clearThread(input: { workspaceId: string; clientId: string }): Promise<void>
}

/**
 * A compact transcript of prior turns for context-aware follow-ups. Each turn
 * becomes a `Q: …\nA: <lead> <body>` pair — lead+body only, never the sources or
 * confidence blob, so the prompt stays lean and the model resolves references
 * ("that", "they") without leaning on a full prior answer. Empty for no turns.
 */
export function buildHistoryTranscript(turns: AskThreadTurn[]): string {
  return turns
    .map((turn) => {
      const answer = [turn.answer.lead, turn.answer.body]
        .map((part) => part.trim())
        .filter((part) => part.length > 0)
        .join(" ")
      return `Q: ${turn.question.trim()}\nA: ${answer}`
    })
    .join("\n\n")
}
