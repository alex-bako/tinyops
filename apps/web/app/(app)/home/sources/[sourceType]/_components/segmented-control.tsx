"use client"

import * as React from "react"

import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { cn } from "@workspace/ui/lib/utils"

type SegmentedOption = {
  value: string
  label: React.ReactNode
}

function SegmentedControl({
  options,
  defaultValue,
  value,
  onChange,
  className,
  ariaLabel,
}: {
  options: SegmentedOption[]
  defaultValue?: string
  value?: string
  onChange?: (next: string) => void
  className?: string
  ariaLabel?: string
}) {
  return (
    <Tabs
      value={value}
      defaultValue={defaultValue ?? options[0]?.value}
      onValueChange={onChange}
      className={cn("w-fit", className)}
    >
      <TabsList aria-label={ariaLabel} className="h-8">
        {options.map((option) => (
          <TabsTrigger
            key={option.value}
            value={option.value}
            className="px-3 text-[12.5px]"
          >
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  )
}

export { SegmentedControl }
export type { SegmentedOption }
