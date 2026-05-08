import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-sm border border-transparent px-1.5 py-0.5 text-[12px] font-medium leading-[1.6] tracking-[-0.005em] transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        // Soft neutral chip — default fallback
        neutral: "bg-[rgba(15,23,42,0.07)] text-muted-foreground",
        // Mint — confirmed / approved / low risk
        active: "bg-mint-100 text-mint-700",
        // Citron — gentle attention, "review", "medium"
        warn: "bg-citron-300/40 text-citron-700",
        // Cobalt — informational / brand-tinted, e.g. "3 to review"
        brand: "bg-cobalt-500/10 text-cobalt-700",
        // Coral — sensitivity / care signal (NEVER red error)
        sensitive: "bg-sensitive-bg text-sensitive-fg",
        // Slate-900 with citron pop — "do not contact"
        dnc: "bg-slate-900 text-citron-500",
        // Tag — a softer, all-purpose label (cohort, source, etc.)
        tag: "bg-[rgba(15,23,42,0.07)] text-slate-700 rounded-xs px-1.5",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  }
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "neutral"}
      className={cn(badgeVariants({ variant, className }))}
      {...props}
    />
  )
}

function BadgeDot({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="badge-dot"
      className={cn(
        "inline-block size-[5px] shrink-0 rounded-full bg-current opacity-80",
        className
      )}
      {...props}
    />
  )
}

export { Badge, BadgeDot, badgeVariants }
