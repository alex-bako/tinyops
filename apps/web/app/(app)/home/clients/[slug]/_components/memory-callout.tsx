import { RefreshCwIcon, SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Callout,
  CalloutStamp,
  CalloutSummary,
} from "@workspace/ui/components/callout"
import { cn } from "@workspace/ui/lib/utils"

import type { ClientMemory } from "@/lib/clients"

export function MemoryCallout({ memory }: { memory: ClientMemory }) {
  const pct = Math.round(memory.confidence * 100)
  return (
    <Callout tone="brand" className="mt-3">
      <CalloutStamp>
        <SparklesIcon className="size-[11px]" />
        AI memory · grounded in source events
      </CalloutStamp>
      <CalloutSummary>{memory.summary}</CalloutSummary>
      <div
        className={cn(
          "mt-3 flex items-center gap-2 text-[12.5px] text-muted-foreground"
        )}
      >
        <span>Confidence</span>
        <span
          aria-hidden
          className="inline-block h-1 w-20 overflow-hidden rounded-full bg-cobalt-500/15"
        >
          <span
            className="block h-full rounded-full bg-cobalt-500"
            style={{ width: `${pct}%` }}
          />
        </span>
        <span className="font-mono text-foreground tabular-nums">{pct}%</span>
        <span aria-hidden className="text-muted-foreground/40">
          ·
        </span>
        <span className="font-mono">{memory.lastGenerated}</span>
        <span className="ml-auto">
          <Button variant="tertiary" size="sm">
            <RefreshCwIcon />
            Refresh
          </Button>
        </span>
      </div>
    </Callout>
  )
}
