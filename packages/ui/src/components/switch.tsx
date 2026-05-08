"use client"

import * as React from "react"
import { Switch as SwitchPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

function Switch({
  className,
  size = "default",
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "group/switch relative inline-block shrink-0 cursor-pointer rounded-full border border-transparent align-middle transition-colors duration-[120ms] outline-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=default]:h-[16px] data-[size=default]:w-[28px]",
        "data-[size=sm]:h-[14px] data-[size=sm]:w-[24px]",
        "data-checked:bg-primary",
        "data-unchecked:bg-[rgba(15,23,42,0.20)]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none absolute top-1/2 left-[2px] -translate-y-1/2 rounded-full bg-white shadow-1 transition-transform duration-[120ms] will-change-transform",
          "group-data-[size=default]/switch:size-[12px]",
          "group-data-[size=sm]/switch:size-[10px]",
          "group-data-[size=default]/switch:data-checked:translate-x-[12px]",
          "group-data-[size=sm]/switch:data-checked:translate-x-[10px]",
          "data-unchecked:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
