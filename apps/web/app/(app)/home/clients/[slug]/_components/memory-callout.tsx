import { RefreshCwIcon, SparklesIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Callout,
  CalloutStamp,
  CalloutSummary,
} from "@workspace/ui/components/callout"
import { ConfidenceMeter } from "@workspace/ui/components/confidence-meter"

import type { ClientMemoryView } from "../_view-model"

export function MemoryCallout({ memory }: { memory: ClientMemoryView }) {
  return (
    <Callout tone="brand" className="mt-3">
      <CalloutStamp>
        <SparklesIcon className="size-[11px]" />
        AI memory · grounded in source events
      </CalloutStamp>
      <CalloutSummary>{memory.summary}</CalloutSummary>
      <div className="mt-3 flex items-center gap-3 text-[12px] text-muted-foreground">
        <ConfidenceMeter pct={memory.confidencePct} />
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
