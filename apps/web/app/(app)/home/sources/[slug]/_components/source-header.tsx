import { MoreHorizontalIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { SourceLogo } from "@/components/source-logo"

import { StatusDot } from "./status-dot"
import type { SourceDetailHeader } from "../_view-model"

function SourceHeader({
  header,
}: {
  header: SourceDetailHeader
}) {
  const isConnected = header.status.variant !== "off"
  return (
    <header className="mb-2 flex items-start gap-4 border-b border-border pb-6">
      <SourceLogo icon={header.icon} className={header.logoClassName} />

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="m-0 font-sans text-[28px] font-bold leading-[1.1] tracking-[-0.02em] text-foreground">
            {header.title}
          </h1>
          {header.isNew ? (
            <span className="rounded-[3px] bg-citron-300/30 px-1.5 py-0.5 text-[10.5px] font-medium uppercase tracking-[0.04em] text-citron-700">
              New
            </span>
          ) : null}
          <StatusDot status={header.status} />
        </div>
        <p className="m-0 text-[14px] text-muted-foreground">{header.subtitle}</p>
      </div>

      {isConnected ? (
        <div className="flex items-center gap-1 pt-1.5">
          <Button type="button" variant="ghost" size="sm">
            <RefreshCwIcon />
            Sync now
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={`More actions for ${header.title}`}
          >
            <MoreHorizontalIcon />
          </Button>
        </div>
      ) : null}
    </header>
  )
}

export { SourceHeader }
