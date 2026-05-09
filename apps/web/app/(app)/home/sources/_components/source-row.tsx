import {
  MoreHorizontalIcon,
  PlugZapIcon,
  RefreshCwIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import {
  SourceListActions,
  SourceListBody,
  SourceListDescription,
  SourceListIcon,
  SourceListRow,
  SourceListStat,
  SourceListStats,
  SourceListTitle,
} from "@workspace/ui/components/source-list"
import { cn } from "@workspace/ui/lib/utils"

import { SourceIcon } from "@/components/source-icon"
import type { DataSource } from "@/lib/sources"

function SourceRow({ source }: { source: DataSource }) {
  return (
    <SourceListRow
      data-connected={source.connected ? "true" : "false"}
    >
      <SourceListIcon
        className={cn(
          source.connected
            ? "bg-cobalt-500/10 text-cobalt-700"
            : "bg-[var(--tint-hover)] text-muted-foreground/80"
        )}
      >
        <SourceIcon icon={source.icon} className="size-4" />
      </SourceListIcon>

      <SourceListBody>
        <SourceListTitle>{source.title}</SourceListTitle>
        <SourceListDescription>{source.sub}</SourceListDescription>
      </SourceListBody>

      <SourceListStats>
        {source.connected ? (
          source.stats.map((stat) => (
            <SourceListStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
            />
          ))
        ) : (
          <Badge variant="neutral">Not connected</Badge>
        )}
      </SourceListStats>

      <SourceListActions>
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
      </SourceListActions>
    </SourceListRow>
  )
}

export { SourceRow }
