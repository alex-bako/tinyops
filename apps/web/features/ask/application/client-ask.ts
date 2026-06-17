import type { UIMessage } from "ai"

import type {
  ClientProfile,
  ClientReaderPort,
} from "@/features/clients/domain/client-profile"
import type { AnswerSynthesizerPort } from "@/features/ask/domain/answer-draft"
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
    }: {
      client: ClientProfile
      question: string
    }): AsyncGenerator<GroundedAnswerData> {
      const context = buildGroundingContext(client, question)

      if (context.events.length === 0) {
        yield emptyGroundedAnswer({ question, context })
        return
      }

      const clock = now()
      const synthesis = synthesizer.synthesize(context)

      for await (const partial of synthesis.partials) {
        yield draftToGroundedAnswer({ question, draft: partial, context, now: clock })
      }

      const final = await synthesis.final
      yield draftToGroundedAnswer({ question, draft: final, context, now: clock })
    },
  }
}

export type ClientAskApplication = ReturnType<typeof createClientAskApplication>
