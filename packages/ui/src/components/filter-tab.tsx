"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

/**
 * Notion-style filter pill tabs. Use when filtering a single list view.
 * For tabbed *content* panels prefer `Tabs` (Radix) instead.
 *
 * Pattern:
 * ```
 * <FilterTabs value={filter} onValueChange={setFilter} aria-label="Filter clients">
 *   <FilterTab value="all">All <FilterTabCount>{count}</FilterTabCount></FilterTab>
 *   <FilterTab value="active">Active <FilterTabCount>{count}</FilterTabCount></FilterTab>
 * </FilterTabs>
 * ```
 */

type FilterTabsContextValue = {
  value: string
  onValueChange: (next: string) => void
  registerTab: (value: string, ref: React.RefObject<HTMLButtonElement | null>) => () => void
  focusByDelta: (currentValue: string, delta: 1 | -1) => void
}

const FilterTabsContext = React.createContext<FilterTabsContextValue | null>(
  null
)

function useFilterTabsContext() {
  const ctx = React.useContext(FilterTabsContext)
  if (!ctx) {
    throw new Error("FilterTab must be rendered inside <FilterTabs>")
  }
  return ctx
}

function FilterTabs({
  value,
  defaultValue,
  onValueChange,
  className,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const isControlled = value !== undefined
  const [internalValue, setInternalValue] = React.useState(defaultValue ?? "")
  const current = isControlled ? value : internalValue

  const handleChange = React.useCallback(
    (next: string) => {
      if (!isControlled) setInternalValue(next)
      onValueChange?.(next)
    },
    [isControlled, onValueChange]
  )

  const tabsRef = React.useRef<
    Array<{ value: string; ref: React.RefObject<HTMLButtonElement | null> }>
  >([])

  const registerTab = React.useCallback(
    (val: string, ref: React.RefObject<HTMLButtonElement | null>) => {
      tabsRef.current = [...tabsRef.current, { value: val, ref }]
      return () => {
        tabsRef.current = tabsRef.current.filter((t) => t.ref !== ref)
      }
    },
    []
  )

  const focusByDelta = React.useCallback(
    (currentValue: string, delta: 1 | -1) => {
      const list = tabsRef.current
      if (list.length === 0) return
      const idx = list.findIndex((t) => t.value === currentValue)
      if (idx < 0) return
      const next = (idx + delta + list.length) % list.length
      list[next]?.ref.current?.focus()
    },
    []
  )

  const ctx = React.useMemo<FilterTabsContextValue>(
    () => ({
      value: current ?? "",
      onValueChange: handleChange,
      registerTab,
      focusByDelta,
    }),
    [current, handleChange, registerTab, focusByDelta]
  )

  return (
    <FilterTabsContext.Provider value={ctx}>
      <div
        data-slot="filter-tabs"
        role="tablist"
        className={cn("inline-flex flex-wrap items-center gap-0", className)}
        {...props}
      >
        {children}
      </div>
    </FilterTabsContext.Provider>
  )
}

function FilterTab({
  value,
  className,
  children,
  onClick,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"button">, "value"> & { value: string }) {
  const ctx = useFilterTabsContext()
  const ref = React.useRef<HTMLButtonElement | null>(null)
  const active = ctx.value === value

  React.useEffect(() => ctx.registerTab(value, ref), [ctx, value])

  return (
    <button
      ref={ref}
      type="button"
      role="tab"
      aria-selected={active}
      data-slot="filter-tab"
      data-state={active ? "active" : "inactive"}
      tabIndex={active ? 0 : -1}
      className={cn(
        "group/filter-tab inline-flex items-center gap-1.5 whitespace-nowrap rounded-sm border-none bg-transparent px-2.5 py-1.5 font-sans text-[13px] font-medium tracking-[-0.005em] text-muted-foreground transition-colors duration-(--dur-fast) ease-(--ease-out)",
        "hover:bg-[var(--tint-hover)] hover:text-foreground",
        "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/30",
        "data-[state=active]:bg-[var(--tint-active)] data-[state=active]:text-foreground",
        className
      )}
      onClick={(e) => {
        ctx.onValueChange(value)
        onClick?.(e)
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight") {
          e.preventDefault()
          ctx.focusByDelta(value, 1)
        } else if (e.key === "ArrowLeft") {
          e.preventDefault()
          ctx.focusByDelta(value, -1)
        } else if (e.key === "Home") {
          e.preventDefault()
          ref.current?.parentElement
            ?.querySelector<HTMLButtonElement>("[role=tab]:first-child")
            ?.focus()
        } else if (e.key === "End") {
          e.preventDefault()
          const all = ref.current?.parentElement?.querySelectorAll<HTMLButtonElement>(
            "[role=tab]"
          )
          all?.[all.length - 1]?.focus()
        }
        onKeyDown?.(e)
      }}
      {...props}
    >
      {children}
    </button>
  )
}

function FilterTabCount({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="filter-tab-count"
      className={cn(
        "font-mono text-[11px] tabular-nums text-muted-foreground/80",
        "group-data-[state=active]/filter-tab:text-cobalt-500",
        className
      )}
      {...props}
    />
  )
}

export { FilterTabs, FilterTab, FilterTabCount }
