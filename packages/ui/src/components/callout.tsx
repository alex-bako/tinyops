import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const calloutVariants = cva("relative pl-5 py-1", {
  variants: {
    tone: {
      brand: "border-l-[3px] border-cobalt-500",
      sensitive: "border-l-[3px] border-coral-500",
      neutral: "border-l-[3px] border-slate-300",
    },
  },
  defaultVariants: {
    tone: "brand",
  },
})

function Callout({
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof calloutVariants>) {
  return (
    <div
      data-slot="callout"
      data-tone={tone ?? "brand"}
      className={cn(calloutVariants({ tone }), className)}
      {...props}
    />
  )
}

function CalloutStamp({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="callout-stamp"
      className={cn(
        "mb-2 inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-cobalt-700",
        "group-data-[tone=sensitive]/callout:text-coral-700 group-data-[tone=neutral]/callout:text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function CalloutSummary({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="callout-summary"
      className={cn(
        "m-0 font-sans text-[18px] font-normal leading-[1.5] tracking-[-0.012em] text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Callout, CalloutStamp, CalloutSummary }
