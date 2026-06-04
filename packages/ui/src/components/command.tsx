"use client"

import * as React from "react"
import { Command as CommandPrimitive } from "cmdk"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Thin, token-styled wrapper over cmdk. Unlike the stock shadcn `Command`,
 * `CommandInput` here is the bare input only (no border/icon shell) so callers
 * can wrap it in their own field chrome — e.g. the home hero search. Drive with
 * `shouldFilter={false}` when items come from an async/server source.
 */
function Command({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command"
      className={cn("flex w-full flex-col", className)}
      {...props}
    />
  )
}

function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <CommandPrimitive.Input
      data-slot="command-input"
      className={cn(
        "min-w-0 flex-1 border-none bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-slate-300",
        className
      )}
      {...props}
    />
  )
}

function CommandList({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn("overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  )
}

function CommandEmpty(
  props: React.ComponentProps<typeof CommandPrimitive.Empty>
) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className="px-3.5 py-[18px] text-center text-[13px] leading-[1.6] text-muted-foreground"
      {...props}
    />
  )
}

function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        "px-0.5 py-1 [&_[cmdk-group-heading]]:px-2.5 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-1",
        className
      )}
      {...props}
    />
  )
}

function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      className={cn("my-0.5 h-px bg-border", className)}
      {...props}
    />
  )
}

function CommandItem({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        "flex cursor-pointer select-none items-center gap-[11px] rounded-sm px-2.5 py-[7px] outline-none",
        "data-[selected=true]:bg-cobalt-50",
        "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-60",
        className
      )}
      {...props}
    />
  )
}

export {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
}
