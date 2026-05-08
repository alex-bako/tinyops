import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

function BigSearch({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="big-search"
      className={cn(
        "flex h-[46px] items-center gap-2.5 rounded-md border border-input bg-card px-3.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function BigSearchIcon({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="big-search-icon"
      className={cn(
        "inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4",
        className
      )}
      {...props}
    />
  )
}

function BigSearchInput({
  className,
  ...props
}: React.ComponentProps<"input">) {
  return (
    <input
      data-slot="big-search-input"
      className={cn(
        "flex-1 border-none bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-slate-300",
        className
      )}
      {...props}
    />
  )
}

export { BigSearch, BigSearchIcon, BigSearchInput }
