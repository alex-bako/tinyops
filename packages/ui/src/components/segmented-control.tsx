"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

type SegmentedOption<T extends string> = {
  value: T
  label: React.ReactNode
}

function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T
  onChange: (next: T) => void
  options: SegmentedOption<T>[]
  className?: string
}) {
  return (
    <div
      data-slot="segmented-control"
      role="radiogroup"
      className={cn(
        "inline-flex rounded-md border border-input bg-[var(--tint-hover,rgba(15,23,42,0.04))] p-0.5 text-[13px]",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            data-state={active ? "on" : "off"}
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-[5px] px-3 py-1 font-medium transition-colors duration-(--dur-fast)",
              active
                ? "bg-background text-foreground shadow-1"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export { SegmentedControl }
export type { SegmentedOption }
