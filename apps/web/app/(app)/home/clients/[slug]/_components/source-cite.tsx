"use client"

import {
  ArrowUpRightIcon,
  ClipboardListIcon,
  CreditCardIcon,
  GraduationCapIcon,
  MailIcon,
  SendIcon,
  type LucideIcon,
} from "lucide-react"

import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { cn } from "@workspace/ui/lib/utils"

import type { AskSource, AskSourceIcon } from "@/features/clients/application/client-ask"

const SOURCE_ICONS: Record<AskSourceIcon, LucideIcon> = {
  mail: MailIcon,
  form: ClipboardListIcon,
  sent: SendIcon,
  course: GraduationCapIcon,
  payment: CreditCardIcon,
}

// A rich citation card behind a grounded answer: who said it, from which
// source, when, and the snippet. Sensitive events render in the care/coral
// tone. Clicking opens the cited event (when a handler is provided).
export function SourceCite({
  source,
  onOpen,
}: {
  source: AskSource
  onOpen?: (source: AskSource) => void
}) {
  const Icon = SOURCE_ICONS[source.sourceIcon]
  const interactive = Boolean(onOpen)

  return (
    <div
      data-slot="source-cite"
      data-sensitive={source.sensitive ? "true" : "false"}
      className={cn(
        "group/cite -mx-2 grid grid-cols-[28px_1fr_auto] items-start gap-3 rounded-sm border-b border-border px-2 py-3 last:border-b-0",
        interactive && "cursor-pointer transition-colors hover:bg-muted"
      )}
      onClick={onOpen ? () => onOpen(source) : undefined}
    >
      <TonalAvatar name={source.name} size="md" />

      <div className="flex min-w-0 flex-col gap-[3px]">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-medium whitespace-nowrap text-foreground">
            {source.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-xs bg-muted px-1.5 py-px font-mono text-[10.5px] text-muted-foreground">
            <Icon className="size-[11px]" />
            {source.sourceLabel}
          </span>
        </div>
        <div
          className={cn(
            "text-[12.5px] leading-[1.5] text-muted-foreground",
            source.sensitive && "text-coral-700"
          )}
        >
          {source.snippet}
        </div>
      </div>

      <span className="inline-flex items-center gap-1 pt-px font-mono text-[11.5px] whitespace-nowrap text-muted-foreground">
        {source.when}
        <ArrowUpRightIcon className="size-3 opacity-0 transition-opacity group-hover/cite:opacity-100" />
      </span>
    </div>
  )
}
