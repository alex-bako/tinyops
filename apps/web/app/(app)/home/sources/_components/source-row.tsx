import {
  MoreHorizontalIcon,
  PlugZapIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { SOURCE_ICON_MAP, type DataSource } from "@/lib/sources"

function SourceRow({ source }: { source: DataSource }) {
  const Icon = SOURCE_ICON_MAP[source.icon]
  return (
    <div
      data-slot="source-row"
      data-connected={source.connected ? "true" : "false"}
      className={cn(
        "group/source-row -mx-2 grid grid-cols-[32px_1fr_auto_auto] items-center gap-3.5 rounded-sm border-b border-border px-2 py-3.5 last:border-b-0",
        "cursor-pointer transition-[background] duration-75 hover:bg-[var(--tint-hover)]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "inline-flex size-8 items-center justify-center rounded-sm",
          source.connected
            ? "bg-cobalt-500/10 text-cobalt-700"
            : "bg-[var(--tint-hover)] text-muted-foreground/80"
        )}
      >
        <Icon className="size-4" />
      </span>

      <div className="flex min-w-0 flex-col gap-[2px]">
        <span className="text-[14px] font-medium tracking-[-0.005em] text-foreground">
          {source.title}
        </span>
        <span className="truncate text-[12.5px] text-muted-foreground">
          {source.sub}
        </span>
      </div>

      <div className="flex items-center gap-[18px] text-[12px] text-muted-foreground tabular-nums">
        {source.connected ? (
          source.stats.map((stat) => (
            <div
              key={stat.label}
              className="flex min-w-[60px] flex-col items-start gap-[1px]"
            >
              <span>{stat.label}</span>
              <span className="text-[13.5px] font-medium text-foreground">
                {stat.value}
              </span>
            </div>
          ))
        ) : (
          <Badge variant="neutral">Not connected</Badge>
        )}
      </div>

      <div className="flex items-center gap-1">
        {source.connected ? (
          <>
            <Button type="button" variant="ghost" size="sm">
              <RefreshCwIcon />
              Sync
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`More actions for ${source.title}`}
            >
              <MoreHorizontalIcon />
            </Button>
          </>
        ) : (
          <Button type="button" variant="secondary" size="sm">
            <PlugZapIcon />
            Connect
          </Button>
        )}
      </div>
    </div>
  )
}

export { SourceRow }
