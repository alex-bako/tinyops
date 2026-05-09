import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function Form({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form"
      className={cn("flex flex-col gap-[18px]", className)}
      {...props}
    />
  )
}

function FormRow({
  label,
  help,
  className,
  children,
}: {
  label: React.ReactNode
  help?: React.ReactNode
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      data-slot="form-row"
      className={cn(
        "grid items-start gap-6 sm:grid-cols-[200px_minmax(0,1fr)]",
        className
      )}
    >
      <div data-slot="form-row-label" className="flex flex-col gap-1 pt-[7px]">
        <span
          data-slot="form-row-label-text"
          className="text-[13.5px] font-medium tracking-[-0.005em] text-foreground"
        >
          {label}
        </span>
        {help ? (
          <span
            data-slot="form-row-help"
            className="text-[12px] leading-[1.5] text-muted-foreground [&_code]:rounded-[3px] [&_code]:bg-[var(--tint-hover)] [&_code]:px-1 [&_code]:py-px [&_code]:font-mono [&_code]:text-[11px]"
          >
            {help}
          </span>
        ) : null}
      </div>
      <div
        data-slot="form-row-field"
        className="flex min-w-0 flex-col gap-1.5"
      >
        {children}
      </div>
    </div>
  )
}

function FormGrid({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="form-grid"
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2",
        className
      )}
      {...props}
    />
  )
}

export { Form, FormRow, FormGrid }
