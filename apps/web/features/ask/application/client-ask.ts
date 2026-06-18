import type { UIMessage } from "ai"

import type {
  ClientProfile,
  ClientReaderPort,
} from "@/features/clients/domain/client-profile"
import type { AnswerSynthesizerPort } from "@/features/ask/domain/answer-draft"
import type { AskThreadTurn } from "@/features/ask/domain/ask-thread"
import {
  buildGroundingContext,
  draftToGroundedAnswer,
  emptyGroundedAnswer,
} from "@/features/ask/domain/grounding"

// Application-layer contract for the client-scoped "Ask AI" surface. The server
// streams a `GroundedAnswerData` to the client as a typed `data-answer` message
// part, and the UI renders it. The grounded-answer model itself lives in the
// domain layer and is re-exported here so consumers have one import surface.

export type {
  AskSource,
  AskSourceIcon,
  GroundedAnswerData,
} from "@/features/ask/domain/grounded-answer"

import type { GroundedAnswerData } from "@/features/ask/domain/grounded-answer"

/** Typed AI SDK data parts carried on the assistant message. */
export type AskDataParts = {
  answer: GroundedAnswerData
}

export type AskMessage = UIMessage<never, AskDataParts>

/**
 * Reconstruct the AI SDK message history from persisted thread turns so a
 * hydrated thread renders identically to a live one: each turn becomes a `user`
 * text message (the question) followed by an `assistant` `data-answer` message.
 * The authoritative asker (from the turn) is stamped onto the answer.
 */
export function askThreadToMessages(turns: AskThreadTurn[]): AskMessage[] {
  return turns.flatMap((turn): AskMessage[] => {
    const answer: GroundedAnswerData = turn.askedBy
      ? { ...turn.answer, askedBy: turn.askedBy }
      : turn.answer
    return [
      {
        id: `${turn.id}-q`,
        role: "user",
        parts: [{ type: "text", text: turn.question }],
      },
      {
        id: `${turn.id}-a`,
        role: "assistant",
        parts: [{ type: "data-answer", data: answer }],
      },
    ]
  })
}

/**
 * Use-case for answering a question about one client, grounded in their
 * timeline. `loadClient` lets the route 404 cleanly before any streaming;
 * `streamGroundedAnswer` yields progressive grounded answers and ends with the
 * complete answer. A client with no events short-circuits without an LLM call.
 * The clock is injected so citation timestamps are deterministic in tests.
 */
export function createClientAskApplication({
  workspaceId,
  reader,
  synthesizer,
  now = () => new Date(),
}: {
  workspaceId: string
  reader: ClientReaderPort
  synthesizer: AnswerSynthesizerPort
  now?: () => Date
}) {
  return {
    loadClient(slug: string): Promise<ClientProfile | null> {
      return reader.findClientBySlug({ workspaceId, slug })
    },

    async *streamGroundedAnswer({
      client,
      question,
      history,
      askedBy,
    }: {
      client: ClientProfile
      question: string
      /** Compact transcript of earlier turns, for context-aware follow-ups. */
      history?: string
      /** Display name of the asker, stamped onto each answer for attribution. */
      askedBy?: string | null
    }): AsyncGenerator<GroundedAnswerData> {
      const context = buildGroundingContext(client, question, history)

      if (context.events.length === 0) {
        yield emptyGroundedAnswer({ question, context, askedBy })
        return
      }

      const clock = now()
      const synthesis = synthesizer.synthesize(context)

      for await (const partial of synthesis.partials) {
        yield draftToGroundedAnswer({ question, draft: partial, context, now: clock, askedBy })
      }

      const final = await synthesis.final
      yield draftToGroundedAnswer({ question, draft: final, context, now: clock, askedBy })
    },
  }
}

export type ClientAskApplication = ReturnType<typeof createClientAskApplication>
