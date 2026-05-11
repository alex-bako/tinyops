"use client"

import * as React from "react"
import { PlusIcon, SearchIcon, XIcon } from "lucide-react"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@workspace/ui/components/popover"
import { cn } from "@workspace/ui/lib/utils"

type ChipItem = {
  id: string
  label: string
  meta?: string
}

const EMPTY_CHIP_VALUE: string[] = []

function ChipPicker({
  items,
  defaultValue = EMPTY_CHIP_VALUE,
  placeholder = "Add…",
  mono = false,
  onChange,
}: {
  items: ChipItem[]
  defaultValue?: string[]
  placeholder?: string
  mono?: boolean
  onChange?: (next: string[]) => void
}) {
  const [value, setValue] = React.useState<string[]>(() => defaultValue)
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const update = (next: string[]) => {
    setValue(next)
    onChange?.(next)
  }
  const remove = (id: string) => update(value.filter((entry) => entry !== id))
  const add = (id: string) => {
    if (value.includes(id)) return
    update([...value, id])
    setQuery("")
  }

  const visible = items.filter(
    (item) =>
      !value.includes(item.id) &&
      item.label.toLowerCase().includes(query.toLowerCase())
  )

  const labelFor = (id: string) =>
    items.find((entry) => entry.id === id)?.label ?? id
  const metaFor = (id: string) =>
    items.find((entry) => entry.id === id)?.meta

  return (
    <div className="relative">
      <div className="flex flex-wrap items-center gap-1 rounded-sm border border-[color:var(--rule-strong)] bg-background p-1 min-h-[32px]">
        {value.map((id) => (
          <span
            key={id}
            className={cn(
              "inline-flex items-center gap-1 rounded-[3px] bg-[var(--tint-hover)] py-px pl-2 pr-1 text-[12px] text-foreground",
              mono && "font-mono text-[11.5px]"
            )}
          >
            {labelFor(id)}
            {metaFor(id) ? (
              <span className="font-mono text-[10.5px] text-muted-foreground">
                {metaFor(id)}
              </span>
            ) : null}
            <button
              type="button"
              aria-label={`Remove ${labelFor(id)}`}
              onClick={() => remove(id)}
              className="inline-flex size-4 items-center justify-center rounded-full text-muted-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <XIcon className="size-2.5" />
            </button>
          </span>
        ))}

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex h-[22px] items-center gap-1 rounded-[3px] border border-dashed border-[color:var(--rule-strong)] px-2 text-[12px] text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
            >
              <PlusIcon className="size-2.5" />
              {placeholder}
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-[280px] p-0 text-popover-foreground"
          >
            <div className="flex items-center gap-1.5 border-b border-border px-2 py-1.5 text-muted-foreground">
              <SearchIcon className="size-3" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search…"
                className="flex-1 bg-transparent text-[12.5px] text-foreground outline-none"
              />
            </div>
            <div className="max-h-[220px] overflow-y-auto p-1">
              {visible.length === 0 ? (
                <div className="px-3 py-4 text-center text-[12px] text-muted-foreground">
                  No matches
                </div>
              ) : (
                visible.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => add(item.id)}
                    className="flex w-full items-center gap-2 rounded-[3px] px-2 py-1.5 text-left transition-colors hover:bg-[var(--tint-hover)]"
                  >
                    <span
                      className={cn(
                        "text-[12.5px] text-foreground",
                        mono && "font-mono text-[11.5px]"
                      )}
                    >
                      {item.label}
                    </span>
                    {item.meta ? (
                      <span className="ml-auto font-mono text-[11px] text-muted-foreground">
                        {item.meta}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

export { ChipPicker }
export type { ChipItem }
