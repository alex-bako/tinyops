"use client"

import * as React from "react"
import { CheckIcon, FilterIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import type { TimelineEventType } from "@/features/clients/domain/client-profile"

// Swatches mirror the timeline event dots.
const TYPE_META: Record<TimelineEventType, { label: string; swatch: string }> = {
  email: { label: "Email", swatch: "bg-cobalt-500" },
  form: { label: "Form", swatch: "bg-mint-500" },
  sent: { label: "Sent", swatch: "bg-citron-500" },
  csvimport: { label: "CSV import", swatch: "bg-slate-300" },
  note: { label: "Note", swatch: "bg-slate-300" },
}

export function TimelineFilter({
  types,
  activeTypes,
  countByType,
  onToggleType,
  hideSensitive,
  onToggleSensitive,
  onReset,
}: {
  types: TimelineEventType[]
  activeTypes: ReadonlySet<TimelineEventType>
  countByType: (type: TimelineEventType) => number
  onToggleType: (type: TimelineEventType) => void
  hideSensitive: boolean
  onToggleSensitive: (next: boolean) => void
  onReset: () => void
}) {
  const allOn = types.every((type) => activeTypes.has(type))
  const filterActive = !allOn || hideSensitive
  const hiddenCount =
    types.filter((type) => !activeTypes.has(type)).length +
    (hideSensitive ? 1 : 0)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="tertiary"
          size="sm"
          className={cn(filterActive && "bg-cobalt-500/[0.07] text-cobalt-600")}
          title="Filter timeline by type"
        >
          <FilterIcon className={cn(filterActive && "text-cobalt-500")} />
          Filter
          {filterActive ? (
            <span className="inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-cobalt-500 px-1 font-mono text-[10px] leading-none text-white">
              {hiddenCount}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-56 gap-0 p-1.5">
        <div className="mb-1 flex items-center border-b border-border px-2 pb-2 pt-1">
          <span className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
            Event type
          </span>
          <button
            type="button"
            disabled={!filterActive}
            onClick={onReset}
            className="ml-auto bg-transparent p-0 text-[11.5px] text-cobalt-500 enabled:hover:underline disabled:cursor-default disabled:text-muted-foreground/60"
          >
            Reset
          </button>
        </div>
        {types.map((type) => {
          const meta = TYPE_META[type]
          const on = activeTypes.has(type)
          return (
            <button
              key={type}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggleType(type)}
              className="flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-muted"
            >
              <span
                className={cn(
                  "inline-flex size-[15px] shrink-0 items-center justify-center rounded-[4px] border-[1.5px] text-white",
                  on
                    ? "border-cobalt-500 bg-cobalt-500"
                    : "border-[var(--rule-strong)]"
                )}
              >
                {on ? <CheckIcon className="size-2.5" /> : null}
              </span>
              <span
                className={cn("size-[7px] shrink-0 rounded-full", meta.swatch)}
              />
              <span className="flex-1 text-[13px] text-foreground">
                {meta.label}
              </span>
              <span className="font-mono text-[11px] text-muted-foreground/70">
                {countByType(type)}
              </span>
            </button>
          )
        })}
        <label className="mt-1 flex items-center gap-2 border-t border-border px-2 pb-1 pt-2 text-[12px] text-muted-foreground">
          <Switch
            checked={hideSensitive}
            onCheckedChange={onToggleSensitive}
            aria-label="Hide sensitive events"
          />
          Hide sensitive
        </label>
      </PopoverContent>
    </Popover>
  )
}
