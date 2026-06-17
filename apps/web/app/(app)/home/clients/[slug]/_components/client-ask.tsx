"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  ArrowRightIcon,
  Loader2Icon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react"

import { AiStamp } from "@workspace/ui/components/ai-stamp"
import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import type { AskMessage, GroundedAnswerData } from "@/features/clients/application/client-ask"
import { GroundedAnswer } from "./grounded-answer"

function latestAnswer(messages: AskMessage[]): GroundedAnswerData | null {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i]
    if (!message || message.role !== "assistant") continue
    const part = message.parts.find((p) => p.type === "data-answer")
    if (part && "data" in part) return part.data
  }
  return null
}

// The client-scoped "Ask AI" surface: a grounded Q&A about one client. Driven by
// the AI SDK `useChat` against a (currently mocked) per-client streaming route;
// answers stream back as a typed `data-answer` part rendered by GroundedAnswer.
export function ClientAsk({
  clientId,
  clientName,
  clientEmail,
  exampleQuestions,
}: {
  clientId: string
  clientName: string
  clientEmail: string
  exampleQuestions: string[]
}) {
  const first = clientName.trim().split(/\s+/)[0] || clientName

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport<AskMessage>({
        api: `/api/clients/${clientId}/ask`,
        body: { clientName, clientEmail },
      }),
    [clientId, clientName, clientEmail]
  )

  const { messages, status, sendMessage, setMessages, stop } =
    useChat<AskMessage>({ transport })
  const [draft, setDraft] = React.useState("")

  const answer = latestAnswer(messages)
  const isBusy = status === "submitted" || status === "streaming"
  const isThinking = isBusy && !answer
  const isIdle = !answer && !isBusy

  const ask = (text: string) => {
    const question = text.trim()
    if (!question) return
    sendMessage({ text: question })
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(draft)
    setDraft("")
  }

  const reset = () => {
    stop()
    setMessages([])
    setDraft("")
  }

  return (
    <Section divider>
      <SectionHead
        title={`Ask about ${first}`}
        actions={
          <AiStamp>
            <SparklesIcon className="size-3" />
            grounded in {first}&apos;s timeline
          </AiStamp>
        }
      />

      <form
        onSubmit={submit}
        className="flex min-h-[56px] items-center gap-3 rounded-lg border border-input bg-card px-4 transition-[border-color,box-shadow] duration-(--dur-fast) ease-(--ease-out) focus-within:border-cobalt-500 focus-within:ring-[3px] focus-within:ring-cobalt-500/12"
      >
        <span className="flex size-[30px] shrink-0 items-center justify-center rounded-sm bg-cobalt-500/10 text-cobalt-500">
          <SparklesIcon className="size-[15px]" />
        </span>
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`What has ${first} asked me for?`}
          aria-label={`Ask about ${first}`}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[17px] tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/60"
        />
        {isIdle ? null : (
          <Button type="button" variant="tertiary" size="sm" onClick={reset}>
            <RotateCcwIcon />
            Clear
          </Button>
        )}
        <Button type="submit" variant="primary" size="sm" disabled={isBusy}>
          {isBusy ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ArrowRightIcon />
          )}
          Ask
        </Button>
      </form>

      {isIdle ? (
        <Suggestions className="mt-3.5 flex-wrap">
          {exampleQuestions.map((question) => (
            <Suggestion
              key={question}
              suggestion={question}
              onClick={ask}
              className="text-muted-foreground"
            >
              <SearchIcon className="size-3.5" />
              {question}
            </Suggestion>
          ))}
        </Suggestions>
      ) : null}

      {isThinking ? (
        <div className="mt-6 flex flex-col gap-2.5 border-l-[3px] border-cobalt-300 py-1 pl-5">
          <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] uppercase text-cobalt-700">
            <Loader2Icon className="size-3 animate-spin" />
            Reading {first}&apos;s timeline…
          </span>
          <span className="ask-shimmer-line w-[78%]" />
          <span className="ask-shimmer-line w-[58%]" />
        </div>
      ) : null}

      {answer ? <GroundedAnswer answer={answer} onFollowUp={ask} /> : null}
    </Section>
  )
}
