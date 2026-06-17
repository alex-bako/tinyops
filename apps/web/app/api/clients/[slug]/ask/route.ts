import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  isTextUIPart,
  type UIMessage,
} from "ai"

import { resolveGroundedAnswer } from "@/features/clients/adapters/client-ask-fixtures"
import type { AskMessage } from "@/features/clients/application/client-ask"
import { getLogger } from "@/lib/logging"

export const runtime = "nodejs"

type AskRequestBody = {
  messages?: UIMessage[]
  clientName?: string
  clientEmail?: string
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

// Client-scoped "Ask AI" endpoint. UI-phase stub: it grounds the answer with the
// mocked adapter and streams it back as a typed `data-answer` part. When the real
// grounding use-case lands, only the `resolveGroundedAnswer` call changes.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const logger = getLogger().child({ component: "client_ask_route", slug })

  const body = (await request.json()) as AskRequestBody
  const question = latestUserText(body.messages ?? [])

  const answer = resolveGroundedAnswer({
    question,
    clientName: body.clientName?.trim() || "this client",
    clientEmail: body.clientEmail ?? "",
  })

  logger.info({ event: "client_ask_answered", question }, "client ask answered")

  const stream = createUIMessageStream<AskMessage>({
    execute: ({ writer }) => {
      writer.write({ type: "data-answer", id: "answer", data: answer })
    },
  })

  return createUIMessageStreamResponse({ stream })
}
