import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

type SearchFieldVariant = "hero" | "compact"

const fieldClasses: Record<SearchFieldVariant, string> = {
  hero: "flex h-[46px] items-center gap-2.5 rounded-md border border-input bg-card px-3.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20",
  compact:
    "inline-flex h-[26px] items-center gap-1.5 rounded-sm border border-input bg-background px-2 text-[12.5px] text-foreground transition-colors duration-(--dur-fast) ease-(--ease-out) focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15",
}

const iconClasses: Record<SearchFieldVariant, string> = {
  hero:
    "inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4",
  compact:
    "inline-flex size-3.5 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-3.5",
}

const inputClasses: Record<SearchFieldVariant, string> = {
  hero:
    "min-w-0 flex-1 border-none bg-transparent font-mono text-[14px] text-foreground outline-none placeholder:text-slate-300",
  compact:
    "min-w-0 flex-1 border-0 bg-transparent p-0 font-sans text-[12.5px] text-foreground outline-none placeholder:text-muted-foreground/60",
}

const SearchFieldVariantContext =
  React.createContext<SearchFieldVariant>("hero")

function useSearchFieldVariant(variant?: SearchFieldVariant) {
  const inheritedVariant = React.useContext(SearchFieldVariantContext)
  return variant ?? inheritedVariant
}

function SearchField({
  className,
  variant = "hero",
  ...props
}: React.ComponentProps<"div"> & { variant?: SearchFieldVariant }) {
  return (
    <SearchFieldVariantContext.Provider value={variant}>
      <div
        data-slot="search-field"
        data-variant={variant}
        className={cn(fieldClasses[variant], className)}
        {...props}
      />
    </SearchFieldVariantContext.Provider>
  )
}

function SearchFieldIcon({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & { variant?: SearchFieldVariant }) {
  const resolvedVariant = useSearchFieldVariant(variant)
  return (
    <span
      data-slot="search-field-icon"
      data-variant={resolvedVariant}
      className={cn(iconClasses[resolvedVariant], className)}
      {...props}
    />
  )
}

function SearchFieldInput({
  className,
  variant,
  ...props
}: React.ComponentProps<"input"> & { variant?: SearchFieldVariant }) {
  const resolvedVariant = useSearchFieldVariant(variant)
  return (
    <input
      data-slot="search-field-input"
      data-variant={resolvedVariant}
      type="search"
      className={cn(inputClasses[resolvedVariant], className)}
      {...props}
    />
  )
}

function SearchFieldShortcut({
  className,
  ...props
}: React.ComponentProps<"kbd">) {
  return (
    <kbd
      data-slot="search-field-shortcut"
      className={cn(
        "inline-flex items-center justify-center rounded-xs border border-input px-1.5 py-px font-mono text-[11px] leading-none text-muted-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  SearchField,
  SearchFieldIcon,
  SearchFieldInput,
  SearchFieldShortcut,
}
export type { SearchFieldVariant }
