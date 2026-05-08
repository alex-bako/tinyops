import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-sm border border-transparent text-sm font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:translate-y-px disabled:pointer-events-none disabled:opacity-40 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5 tracking-[-0.005em]",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground hover:bg-cobalt-700",
        accent: "bg-accent text-accent-foreground hover:bg-citron-300",
        secondary:
          "bg-transparent text-foreground border-input hover:bg-muted",
        outline:
          "bg-card text-foreground border-input hover:bg-muted",
        ghost: "bg-transparent text-foreground hover:bg-muted",
        tertiary:
          "bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted",
        destructive:
          "bg-destructive/10 text-coral-700 hover:bg-destructive/20",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-[30px] gap-1.5 px-2.5",
        sm: "h-[26px] gap-1 px-2 text-[12.5px]",
        lg: "h-[34px] gap-1.5 px-3 text-[14px]",
        icon: "size-[30px]",
        "icon-sm": "size-[26px]",
        "icon-lg": "size-[34px]",
        // Inline action chip — sits next to a row, dashed-feel hairline border, dense
        iaction:
          "h-6 gap-1 px-2 rounded-xs text-[12px] text-muted-foreground border-input hover:text-foreground hover:bg-muted [&_svg:not([class*='size-'])]:size-3",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? "primary"}
      data-size={size ?? "default"}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
