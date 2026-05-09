import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

type Tone = "email" | "form" | "sent" | "csv" | "neutral"

const toneDot: Record<Tone, string> = {
  email: "before:bg-cobalt-500",
  form: "before:bg-mint-500",
  sent: "before:bg-citron-500",
  csv: "before:bg-slate-500/60",
  neutral: "before:bg-slate-300",
}

function Timeline({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline"
      className={cn("relative mt-1 flex flex-col", className)}
      {...props}
    />
  )
}

const eventVariants = cva(
  cn(
    "group/tl relative pl-8 pr-1 py-3.5",
    "border-b border-border last:border-b-0",
    // leading dot
    "before:content-[''] before:absolute before:left-2 before:top-5 before:size-[7px] before:rounded-full",
    // connecting rule
    "after:content-[''] after:absolute after:left-[11px] after:top-7 after:bottom-[-1px] after:w-px after:bg-border last:after:hidden"
  ),
  {
    variants: {
      tone: {
        email: toneDot.email,
        form: toneDot.form,
        sent: toneDot.sent,
        csv: toneDot.csv,
        neutral: toneDot.neutral,
      },
      sensitive: {
        true: "bg-coral-500/[0.06] rounded-sm",
        false: "",
      },
    },
    defaultVariants: { tone: "neutral", sensitive: false },
  }
)

function TimelineEvent({
  className,
  tone,
  sensitive,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof eventVariants>) {
  return (
    <div
      data-slot="timeline-event"
      data-tone={tone ?? "neutral"}
      data-sensitive={sensitive ? "true" : undefined}
      className={cn(eventVariants({ tone, sensitive }), className)}
      {...props}
    />
  )
}

function TimelineHead({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-head"
      className={cn(
        "mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 text-[12px]"
      )}
      {...props}
    />
  )
}

function TimelineSrc({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="timeline-src"
      className={cn(
        "font-mono text-[11px] lowercase text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TimelineDate({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="timeline-date"
      className={cn(
        "ml-auto font-mono text-[12px] tabular-nums text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

function TimelineTitle({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="timeline-title"
      className={cn(
        "mt-0.5 text-[14px] font-medium tracking-[-0.005em] text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TimelineSummary({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="timeline-summary"
      className={cn(
        "mt-[3px] max-w-[64ch] text-[13px] leading-[1.55] text-slate-700",
        className
      )}
      {...props}
    />
  )
}

export {
  Timeline,
  TimelineEvent,
  TimelineHead,
  TimelineSrc,
  TimelineDate,
  TimelineTitle,
  TimelineSummary,
}
export type { Tone as TimelineTone }
