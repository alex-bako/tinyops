import type { LucideIcon } from "lucide-react"
import { CheckIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

export function ChoiceCard({
  icon: IconCmp,
  title,
  sub,
  selected,
  onClick,
  badge,
  recommended,
}: {
  icon: LucideIcon
  title: string
  sub: string
  selected: boolean
  onClick: () => void
  badge?: string | null
  recommended?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "grid grid-cols-[36px_1fr_auto] items-center gap-3.5 rounded-md border p-3.5 text-left transition-colors duration-100",
        "border-[rgba(15,23,42,0.12)] bg-card hover:border-[rgba(15,23,42,0.28)] hover:bg-[rgba(15,23,42,0.025)]",
        selected &&
          "border-cobalt-500 bg-cobalt-500/[0.04] shadow-[0_0_0_3px_rgba(37,99,235,0.10)] hover:border-cobalt-500"
      )}
    >
      <span
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-sm bg-[rgba(15,23,42,0.05)] text-[rgba(15,23,42,0.65)]",
          selected && "bg-cobalt-500/10 text-cobalt-700"
        )}
      >
        <IconCmp className="size-[18px]" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="inline-flex items-center gap-2 text-[14.5px] font-medium tracking-[-0.005em] text-foreground">
          {title}
          {badge && (
            <span className="rounded-xs bg-[rgba(15,23,42,0.06)] px-1.5 py-px font-mono text-[11px] text-[rgba(15,23,42,0.55)]">
              {badge}
            </span>
          )}
          {recommended && (
            <span className="rounded-xs bg-cobalt-500/10 px-1.5 py-px font-mono text-[10px] uppercase tracking-[0.06em] text-cobalt-700">
              Recommended
            </span>
          )}
        </span>
        <span className="text-[12.5px] leading-[1.45] text-[rgba(15,23,42,0.6)]">
          {sub}
        </span>
      </span>
      <span
        className={cn(
          "inline-flex h-[18px] w-[18px] items-center justify-center rounded-full border-[1.5px] text-transparent",
          "border-[rgba(15,23,42,0.22)]",
          selected && "border-cobalt-500 bg-cobalt-500 text-white"
        )}
      >
        <CheckIcon className="size-2.5" />
      </span>
    </button>
  )
}
