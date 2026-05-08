import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "@workspace/ui/lib/utils"

const headingVariants = cva("font-sans font-semibold text-foreground", {
  variants: {
    level: {
      h1: "text-[48px] leading-[1.05] tracking-[-0.035em]",
      h2: "text-[36px] leading-[1.05] tracking-[-0.03em]",
      h3: "text-[28px] leading-[1.25] tracking-[-0.02em]",
      h4: "text-[18px] leading-[1.25] tracking-[-0.01em]",
    },
  },
  defaultVariants: {
    level: "h1",
  },
})

type HeadingLevel = "h1" | "h2" | "h3" | "h4"

function Heading({
  className,
  level = "h1",
  asChild = false,
  ...props
}: React.ComponentProps<"h1"> &
  VariantProps<typeof headingVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : ((level ?? "h1") as HeadingLevel)
  return (
    <Comp
      data-slot="heading"
      data-level={level}
      className={cn(headingVariants({ level }), className)}
      {...props}
    />
  )
}

function H1(props: React.ComponentProps<typeof Heading>) {
  return <Heading {...props} level="h1" />
}
function H2(props: React.ComponentProps<typeof Heading>) {
  return <Heading {...props} level="h2" />
}
function H3(props: React.ComponentProps<typeof Heading>) {
  return <Heading {...props} level="h3" />
}
function H4(props: React.ComponentProps<typeof Heading>) {
  return <Heading {...props} level="h4" />
}

function Eyebrow({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return (
    <Comp
      data-slot="eyebrow"
      className={cn(
        "font-mono text-[12px] font-medium uppercase tracking-[0.04em] leading-none text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function Body({
  className,
  size = "md",
  asChild = false,
  ...props
}: React.ComponentProps<"p"> & {
  size?: "sm" | "md" | "lg"
  asChild?: boolean
}) {
  const Comp = asChild ? Slot.Root : "p"
  const sizes = {
    sm: "text-[12px] leading-[1.4]",
    md: "text-[14px] leading-[1.65]",
    lg: "text-[16px] leading-[1.65]",
  }
  return (
    <Comp
      data-slot="body"
      data-size={size}
      className={cn(
        "font-sans font-normal text-slate-700",
        sizes[size],
        className
      )}
      {...props}
    />
  )
}

function Caption({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"small"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "small"
  return (
    <Comp
      data-slot="caption"
      className={cn(
        "font-sans text-[12px] leading-[1.25] text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function Mono({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"code"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "code"
  return (
    <Comp
      data-slot="mono"
      className={cn(
        "font-mono text-[13px] text-slate-700",
        className
      )}
      {...props}
    />
  )
}

/**
 * Editorial italic — Instrument Serif italic. Used very sparingly:
 * AI memory summaries, marketing pull-quotes, single-word emphasis.
 */
function EditorialItalic({
  className,
  asChild = false,
  ...props
}: React.ComponentProps<"em"> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "em"
  return (
    <Comp
      data-slot="editorial-italic"
      className={cn(
        "font-serif italic font-normal tracking-[-0.01em]",
        className
      )}
      {...props}
    />
  )
}

export { Heading, H1, H2, H3, H4, Eyebrow, Body, Caption, Mono, EditorialItalic }
