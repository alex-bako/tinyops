import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Document-style table primitives — Notion-leaning.
 * No card container; rules between rows; sticky header by default;
 * row hover tints with `--tint-hover`.
 */
function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div
      data-slot="table-container"
      className={cn("relative w-full", containerClassName)}
    >
      <table
        data-slot="table"
        className={cn(
          "w-full border-collapse text-left font-sans text-[13.5px] text-foreground",
          className
        )}
        {...props}
      />
    </div>
  )
}

function TableHeader({
  className,
  ...props
}: React.ComponentProps<"thead">) {
  return (
    <thead
      data-slot="table-header"
      className={cn("[&_tr]:border-b [&_tr]:border-border", className)}
      {...props}
    />
  )
}

function TableBody({
  className,
  ...props
}: React.ComponentProps<"tbody">) {
  return (
    <tbody
      data-slot="table-body"
      className={cn(
        "[&_tr:last-child]:border-0",
        className
      )}
      {...props}
    />
  )
}

function TableFooter({
  className,
  ...props
}: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "border-t border-border bg-muted/40 font-medium text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TableRow({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"tr"> & { interactive?: boolean }) {
  return (
    <tr
      data-slot="table-row"
      data-interactive={interactive ? "true" : undefined}
      className={cn(
        "group/row border-b border-border align-middle transition-colors duration-(--dur-fast) ease-(--ease-out)",
        "data-[state=selected]:bg-[var(--tint-active)]",
        interactive &&
          "cursor-pointer hover:bg-[var(--tint-hover)] focus-within:bg-[var(--tint-hover)]",
        className
      )}
      {...props}
    />
  )
}

function TableHead({
  className,
  ...props
}: React.ComponentProps<"th">) {
  return (
    <th
      data-slot="table-head"
      className={cn(
        "sticky top-0 z-[1] bg-background px-2.5 py-2.5 text-left font-sans text-[11.5px] font-medium uppercase tracking-[0.04em] whitespace-nowrap text-muted-foreground",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCell({
  className,
  ...props
}: React.ComponentProps<"td">) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        "px-2.5 py-2.5 align-middle text-[13.5px] text-foreground",
        "[&:has([role=checkbox])]:pr-0",
        className
      )}
      {...props}
    />
  )
}

function TableCaption({
  className,
  ...props
}: React.ComponentProps<"caption">) {
  return (
    <caption
      data-slot="table-caption"
      className={cn("mt-3 font-mono text-[12px] text-muted-foreground", className)}
      {...props}
    />
  )
}

export {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
}
