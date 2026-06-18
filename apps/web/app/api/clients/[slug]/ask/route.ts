import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isTextUIPart,
  type UIMessage,
} from "ai"

import type {
  AskMessage,
  GroundedAnswerData,
} from "@/features/ask/application/client-ask"
import { buildHistoryTranscript } from "@/features/ask/domain/ask-thread"
import {
  createClientAskServerContext,
  type ClientAskServerContext,
} from "@/features/ask/loaders"
import { getLogger } from "@/lib/logging"

export const runtime = "nodejs"

type AskRequestBody = {
  messages?: UIMessage[]
}

type AskDependencies = {
  createContext: () => Promise<ClientAskServerContext | null>
}

/** The text of the most recent user message in a UI message list. */
function latestUserText(messages: UIMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!message || message.role !== "user") continue
    return message.parts
      .filter(isTextUIPart)
      .map((part) => part.text)
      .join("")
      .trim()
  }
  return ""
}

/**
 * Client-scoped "Ask AI" endpoint. Requires an authenticated workspace (401),
 * derives the client from the slug within that workspace (404 if absent), and
 * streams a grounded answer as typed `data-answer` parts. Earlier turns are read
 * from the persisted thread (server-side, never trusting client-echoed history)
 * to ground context-aware follow-ups, and the completed turn is appended to the
 * shared thread. Dependencies are injected so the handler is testable without
 * the real Supabase/LLM stack.
 */
export async function handleClientAsk(
  request: Request,
  params: Promise<{ slug: string }>,
  deps: AskDependencies
): Promise<Response> {
  const { slug } = await params
  const logger = getLogger().child({ component: "client_ask_route", slug })

  const context = await deps.createContext()
  if (!context) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const client = await context.application.loadClient(slug)
  if (!client) {
    return Response.json({ error: "client_not_found" }, { status: 404 })
  }

  const body = (await request.json()) as AskRequestBody
  const question = latestUserText(body.messages ?? [])
  if (!question) {
    return Response.json({ error: "empty_question" }, { status: 422 })
  }

  const priorTurns = await context.threadReader.listTurns({
    workspaceId: context.workspaceId,
    clientId: client.id,
  })
  const history = buildHistoryTranscript(priorTurns)

  const stream = createUIMessageStream<AskMessage>({
    execute: async ({ writer }) => {
      let finalAnswer: GroundedAnswerData | null = null
      for await (const answer of context.application.streamGroundedAnswer({
        client,
        question,
        history,
        askedBy: context.askedBy,
      })) {
        writer.write({ type: "data-answer", id: "answer", data: answer })
        finalAnswer = answer
      }

      if (finalAnswer) {
        // The answer already streamed; a persistence failure must not fail the
        // stream. Log it and move on — the user still got their answer.
        try {
          await context.threadWriter.appendTurn({
            workspaceId: context.workspaceId,
            clientId: client.id,
            question,
            answer: finalAnswer,
          })
        } catch (error) {
          logger.error(
            { event: "client_ask_persist_failed", err: error },
            "client ask persist failed"
          )
        }
      }
      logger.info({ event: "client_ask_answered", question }, "client ask answered")
    },
    onError: (error) => {
      logger.error({ event: "client_ask_failed", err: error }, "client ask failed")
      return "Something went wrong answering that. Please try again."
    },
  })

  return createUIMessageStreamResponse({ stream })
}

/**
 * Clears the whole shared Ask thread for a client. RLS restricts the delete to
 * owners/admins; for a non-privileged caller it removes nothing (no error), and
 * the UI only surfaces the Clear control to those who can manage it.
 */
export async function handleClientAskClear(
  params: Promise<{ slug: string }>,
  deps: AskDependencies
): Promise<Response> {
  const { slug } = await params
  const logger = getLogger().child({ component: "client_ask_clear_route", slug })

  const context = await deps.createContext()
  if (!context) {
    return Response.json({ error: "unauthorized" }, { status: 401 })
  }

  const client = await context.application.loadClient(slug)
  if (!client) {
    return Response.json({ error: "client_not_found" }, { status: 404 })
  }

  await context.threadWriter.clearThread({
    workspaceId: context.workspaceId,
    clientId: client.id,
  })
  logger.info({ event: "client_ask_cleared" }, "client ask thread cleared")
  return new Response(null, { status: 204 })
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  return handleClientAsk(request, params, {
    createContext: createClientAskServerContext,
  })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  return handleClientAskClear(params, {
    createContext: createClientAskServerContext,
  })
}
