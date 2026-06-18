"use client"

import { ShieldIcon, SparklesIcon } from "lucide-react"

import { ConfidenceMeter } from "@workspace/ui/components/confidence-meter"

import { MessageResponse } from "@/components/ai-elements/message"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import type { AskSource, GroundedAnswerData } from "@/features/ask/application/client-ask"
import { SourceCite } from "./source-cite"

// Renders one grounded answer body: synthesized lead + body, an optional firewall
// notice, confidence + scope, the cited sources, and (only on the latest turn)
// follow-up chips. Purely presentational — it receives a `GroundedAnswerData` and
// emits intent through callbacks. The question echo + author live in the turn
// wrapper so live and pending turns read identically.
export function GroundedAnswer({
  answer,
  onFollowUp,
  onOpenSource,
  showFollowUps = true,
}: {
  answer: GroundedAnswerData
  onFollowUp: (question: string) => void
  onOpenSource?: (source: AskSource) => void
  /** Only the latest answered turn offers follow-ups, to keep the thread clean. */
  showFollowUps?: boolean
}) {
  return (
    <div>
      <MessageResponse className="mb-3 max-w-[60ch] font-sans text-[21px] leading-[1.42] tracking-[-0.014em] text-foreground [&_em]:font-serif [&_em]:font-normal [&_em]:text-cobalt-700 [&_em]:italic">
        {answer.lead}
      </MessageResponse>

      <MessageResponse className="max-w-[64ch] text-[14.5px] leading-[1.6] text-muted-foreground [&_strong]:font-medium [&_strong]:text-foreground">
        {answer.body}
      </MessageResponse>

      {answer.firewall ? (
        <div className="mt-3.5 flex max-w-[60ch] items-start gap-2.5 rounded-sm bg-coral-500/[0.07] px-3 py-2.5 text-[12.5px] leading-[1.5] text-coral-700">
          <ShieldIcon className="mt-px size-3.5 shrink-0 text-coral-500" />
          <span>{answer.firewall}</span>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
        <ConfidenceMeter pct={answer.confidencePct} />
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span>{answer.scope}</span>
      </div>

      {answer.sources.length > 0 ? (
        <>
          <div className="mt-[22px] mb-2 font-mono text-[11px] tracking-[0.04em] uppercase text-muted-foreground">
            Sources · {answer.sources.length} cited
          </div>
          <div className="flex flex-col">
            {answer.sources.map((source, index) => (
              <SourceCite
                key={`${source.email}-${source.when}-${index}`}
                source={source}
                onOpen={onOpenSource}
              />
            ))}
          </div>
        </>
      ) : null}

      {showFollowUps && answer.followUps.length > 0 ? (
        <div className="mt-5">
          <div className="mb-1.5 text-[12px] text-muted-foreground">
            Follow up
          </div>
          <Suggestions>
            {answer.followUps.map((followUp) => (
              <Suggestion
                key={followUp}
                suggestion={followUp}
                onClick={onFollowUp}
                className="border-cobalt-500/20 bg-cobalt-500/[0.06] text-cobalt-700 hover:bg-cobalt-500/[0.12] hover:text-cobalt-700"
              >
                <SparklesIcon className="size-3" />
                {followUp}
              </Suggestion>
            ))}
          </Suggestions>
        </div>
      ) : null}
    </div>
  )
}
