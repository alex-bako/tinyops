"use client"

import * as React from "react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"
import { CheckIcon } from "lucide-react"

function CheckboxGlyph({ className }: { className?: string }) {
  return <CheckIcon className={cn("size-3", className)} />
}

function Checkbox({
  className,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input transition-colors outline-none group-has-disabled/field:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none [&>svg]:size-3.5"
      >
        <CheckboxGlyph className="size-3.5" />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

function CheckCard({
  label,
  description,
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root> & {
  label: React.ReactNode
  description?: React.ReactNode
}) {
  return (
    <CheckboxPrimitive.Root
      data-slot="check-card"
      checked={checked}
      defaultChecked={defaultChecked}
      onCheckedChange={onCheckedChange}
      className={cn(
        "group/check-card flex cursor-pointer items-start gap-2.5 rounded-sm border border-transparent px-2.5 py-2 text-left outline-none transition-colors",
        "hover:bg-[var(--tint-hover)]",
        "data-checked:border-cobalt-500/20 data-checked:bg-cobalt-500/[0.05]",
        "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-[3px] border-[1.5px] border-input bg-background text-transparent",
          "group-data-checked/check-card:border-primary group-data-checked/check-card:bg-primary group-data-checked/check-card:text-primary-foreground"
        )}
      >
        <CheckboxGlyph />
      </span>
      <span className="flex min-w-0 flex-col gap-px text-left">
        <span className="text-[13px] font-medium text-foreground">
          {label}
        </span>
        {description ? (
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {description}
          </span>
        ) : null}
      </span>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox, CheckCard }
