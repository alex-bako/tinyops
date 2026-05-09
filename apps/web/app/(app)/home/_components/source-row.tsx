import { RecordRow } from "@workspace/ui/components/record-row"

import { SourceIcon } from "@/components/source-icon"
import type { HomeSourceRow } from "@/lib/sources"

function SourceRow({ source }: { source: HomeSourceRow }) {
  return (
    <RecordRow variant="source" interactive={false}>
      <span className="inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground">
        <SourceIcon icon={source.icon} className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col leading-[1.3]">
        <span className="text-[13.5px] text-foreground">{source.title}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {source.sub}
        </span>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {source.connected && (
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-mint-500"
          />
        )}
        {source.status}
      </span>
    </RecordRow>
  )
}

export { SourceRow }
