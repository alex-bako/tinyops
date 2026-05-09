"use client"

import Link from "next/link"
import * as React from "react"
import { useRouter } from "next/navigation"
import {
  ChevronRightIcon,
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
import { requestDataSourceSyncAction } from "@/features/data-sources/actions"
import type { SourcesPageRow } from "../_view-model"

function SourceRow({ source }: { source: SourcesPageRow }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()

  const requestSync = () => {
    if (!source.sourceRowId) return

    startTransition(async () => {
      const result = await requestDataSourceSyncAction(source.sourceRowId!)
      if (!result.error) refresh()
    })
  }

  return (
    <SourceListRow data-connected={source.connected ? "true" : "false"}>
      <Link
        href={source.href}
        aria-label={source.configureLabel}
        className="absolute inset-0 z-[1] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring"
      />

      <SourceListIcon
        className={cn(
          "pointer-events-none relative z-[2]",
          source.connected
            ? "bg-cobalt-500/10 text-cobalt-700"
            : "bg-[var(--tint-hover)] text-muted-foreground/80"
        )}
      >
        <SourceIcon icon={source.icon} className="size-4" />
      </SourceListIcon>

      <SourceListBody className="pointer-events-none relative z-[2]">
        <SourceListTitle className="inline-flex items-center gap-1.5">
          {source.title}
          {source.isNew ? (
            <span className="rounded-[3px] bg-citron-300/30 px-1.5 py-px text-[10.5px] font-medium uppercase tracking-[0.04em] text-citron-700">
              New
            </span>
          ) : null}
        </SourceListTitle>
        <SourceListDescription>{source.sub}</SourceListDescription>
      </SourceListBody>

      <SourceListStats className="pointer-events-none relative z-[2]">
        {source.connected ? (
          source.stats.map((stat) => (
            <SourceListStat
              key={stat.label}
              label={stat.label}
              value={stat.value}
            />
          ))
        ) : (
          <Badge variant="neutral">{source.statusLabel}</Badge>
        )}
      </SourceListStats>

      <SourceListActions className="relative z-[3]">
        {source.action === "sync" ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={pending || !source.sourceRowId}
              onClick={requestSync}
            >
              <RefreshCwIcon />
              {source.primaryLabel}
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
            {source.primaryLabel}
          </Button>
        )}
        <span
          aria-hidden
          className="pointer-events-none ml-1 inline-flex text-muted-foreground/60 transition-transform duration-75 group-hover/source-list-row:translate-x-0.5"
        >
          <ChevronRightIcon className="size-3.5" />
        </span>
      </SourceListActions>
    </SourceListRow>
  )
}

export { SourceRow }
