"use client"

import * as React from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport } from "ai"
import {
  ArrowRightIcon,
  CornerDownRightIcon,
  Loader2Icon,
  RotateCcwIcon,
  SearchIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "lucide-react"

import { AiStamp } from "@workspace/ui/components/ai-stamp"
import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import type { AskMessage, GroundedAnswerData } from "@/features/ask/application/client-ask"
import { GroundedAnswer } from "./grounded-answer"

/** One rendered turn: a question, its asker, and its answer (null while pending). */
type AskTurn = {
  key: string
  question: string
  answer: GroundedAnswerData | null
}

/**
 * Walk the AI SDK message list into ordered turns. A user message opens a turn;
 * the following assistant `data-answer` fills it. A trailing user message with no
 * assistant reply is the in-flight (or failed) turn — its answer stays null.
 */
function toTurns(messages: AskMessage[]): AskTurn[] {
  const turns: AskTurn[] = []
  for (const message of messages) {
    if (message.role === "user") {
      const question = message.parts
        .map((part) => (part.type === "text" ? part.text : ""))
        .join("")
        .trim()
      turns.push({ key: message.id, question, answer: null })
    } else if (message.role === "assistant") {
      const part = message.parts.find((p) => p.type === "data-answer")
      const answer = part && "data" in part ? part.data : null
      const open = turns[turns.length - 1]
      if (open && open.answer === null) {
        open.answer = answer
      } else {
        turns.push({ key: message.id, question: answer?.question ?? "", answer })
      }
    }
  }
  return turns
}

// The client-scoped "Ask AI" surface: a grounded, persisted conversation thread
// about one client. Driven by the AI SDK `useChat` against a per-client streaming
// route; each answer streams back as a typed `data-answer` part. The thread is
// shared across the workspace and hydrated from the server on load.
export function ClientAsk({
  slug,
  clientName,
  exampleQuestions,
  initialMessages = [],
  canClearThread = false,
  currentUserName = null,
}: {
  slug: string
  clientName: string
  exampleQuestions: string[]
  initialMessages?: AskMessage[]
  canClearThread?: boolean
  currentUserName?: string | null
}) {
  const first = clientName.trim().split(/\s+/)[0] || clientName

  const transport = React.useMemo(
    () =>
      new DefaultChatTransport<AskMessage>({
        api: `/api/clients/${slug}/ask`,
      }),
    [slug]
  )

  const { messages, status, error, sendMessage, setMessages, stop, regenerate } =
    useChat<AskMessage>({ transport, messages: initialMessages })
  const [draft, setDraft] = React.useState("")
  const [confirmingClear, setConfirmingClear] = React.useState(false)
  const [clearing, setClearing] = React.useState(false)

  const turns = React.useMemo(() => toTurns(messages), [messages])
  const isBusy = status === "submitted" || status === "streaming"
  const isEmpty = turns.length === 0

  // Only auto-scroll for turns the user themselves triggered, never on hydration.
  const shouldScroll = React.useRef(false)
  const endRef = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    if (!shouldScroll.current) return
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" })
  }, [messages.length, status])

  const ask = (text: string) => {
    const question = text.trim()
    if (!question || isBusy) return
    shouldScroll.current = true
    sendMessage({ text: question })
  }

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    ask(draft)
    setDraft("")
  }

  const retry = () => {
    shouldScroll.current = true
    regenerate()
  }

  const clearThread = async () => {
    setClearing(true)
    try {
      const response = await fetch(`/api/clients/${slug}/ask`, { method: "DELETE" })
      if (response.ok) {
        stop()
        setMessages([])
        setDraft("")
      }
    } finally {
      setClearing(false)
      setConfirmingClear(false)
    }
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
          disabled={isBusy}
          placeholder={`What has ${first} asked me for?`}
          aria-label={`Ask about ${first}`}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 text-[17px] tracking-[-0.01em] text-foreground outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
        />
        <Button type="submit" variant="primary" size="sm" disabled={isBusy || !draft.trim()}>
          {isBusy ? (
            <Loader2Icon className="animate-spin" />
          ) : (
            <ArrowRightIcon />
          )}
          Ask
        </Button>
      </form>

      {isEmpty && !isBusy ? (
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

      {turns.map((turn, index) => {
        const isLast = index === turns.length - 1
        const askedBy = turn.answer?.askedBy ?? (isLast ? currentUserName : null)
        return (
          <div
            key={turn.key}
            className={`ask-answer-rise mt-6 border-l-[3px] pl-5 ${
              turn.answer ? "border-cobalt-500" : "border-cobalt-300"
            }`}
          >
            <div className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
              <span className="inline-flex size-5 items-center justify-center rounded-xs bg-muted text-muted-foreground">
                <CornerDownRightIcon className="size-3" />
              </span>
              <span className="text-foreground/85">{turn.question}</span>
              {askedBy ? (
                <span className="text-[12px] text-muted-foreground/70">
                  · asked by {askedBy}
                </span>
              ) : null}
            </div>

            {turn.answer ? (
              <GroundedAnswer
                answer={turn.answer}
                onFollowUp={ask}
                showFollowUps={isLast && !isBusy && !error}
              />
            ) : isBusy ? (
              <div className="flex flex-col gap-2.5 py-1">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] tracking-[0.06em] uppercase text-cobalt-700">
                  <Loader2Icon className="size-3 animate-spin" />
                  Reading {first}&apos;s timeline…
                </span>
                <span className="ask-shimmer-line w-[78%]" />
                <span className="ask-shimmer-line w-[58%]" />
              </div>
            ) : null}
          </div>
        )
      })}

      {error ? (
        <div className="ask-answer-rise mt-6 flex max-w-[60ch] items-start gap-2.5 rounded-sm border-l-[3px] border-coral-500 bg-coral-500/[0.06] px-4 py-3 text-[13px] text-coral-700">
          <TriangleAlertIcon className="mt-px size-4 shrink-0 text-coral-500" />
          <div className="flex flex-col gap-2">
            <span>Something went wrong answering that.</span>
            <div>
              <Button type="button" variant="tertiary" size="sm" onClick={retry}>
                <RotateCcwIcon />
                Try again
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {canClearThread && !isEmpty ? (
        <div className="mt-5 flex justify-end">
          {confirmingClear ? (
            <div className="inline-flex items-center gap-2 text-[12px] text-muted-foreground">
              Delete this conversation for everyone?
              <Button
                type="button"
                variant="tertiary"
                size="sm"
                onClick={() => setConfirmingClear(false)}
                disabled={clearing}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={clearThread}
                disabled={clearing}
              >
                {clearing ? <Loader2Icon className="animate-spin" /> : <RotateCcwIcon />}
                Delete
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={() => setConfirmingClear(true)}
              disabled={isBusy}
            >
              <RotateCcwIcon />
              Clear conversation
            </Button>
          )}
        </div>
      ) : null}

      <div ref={endRef} aria-hidden />
    </Section>
  )
}
