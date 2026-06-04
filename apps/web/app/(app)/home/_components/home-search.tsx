"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import {
  PlusIcon,
  SettingsIcon,
  SparklesIcon,
  UploadIcon,
  UsersIcon,
  SearchIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@workspace/ui/components/command"
import { Badge } from "@workspace/ui/components/badge"
import { Kbd } from "@workspace/ui/components/kbd"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { cn } from "@workspace/ui/lib/utils"

import { ClientStatusBadge } from "@/components/client-state-badge"
import { SourceIcon } from "@/components/source-icon"
import type { HomeSourceRow } from "@/lib/sources"
import { clientProfileHref } from "@/app/(app)/home/clients/_profile-routing"
import { navigateWithOptionalViewTransition } from "@/lib/view-transition-navigation"

import { searchClientsAction } from "../actions"
import {
  buildSearchModel,
  type ActionIcon,
  type RecentClientItem,
  type SearchItem,
} from "./home-search-model"
import type { ClientSearchResult } from "@/features/clients/application/client-memory"

const FOCUS_EVENT = "tinyops:focus-home-search"

const ACTION_ICONS: Record<ActionIcon, LucideIcon> = {
  users: UsersIcon,
  plus: PlusIcon,
  settings: SettingsIcon,
  sparkles: SparklesIcon,
  upload: UploadIcon,
}

/** Shared item chrome: reveals the ↵ affordance on the cmdk-selected row. */
const itemClass = "[&[data-selected=true]_[data-enter]]:opacity-100"

function HomeSearch({
  recentClients,
  sources,
}: {
  recentClients: RecentClientItem[]
  sources: HomeSourceRow[]
}) {
  const router = useRouter()
  const [query, setQuery] = React.useState("")
  const [open, setOpen] = React.useState(false)
  const [clientResults, setClientResults] = React.useState<ClientSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)

  const wrapRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const requestId = React.useRef(0)

  const trimmed = query.trim()
  const hasQuery = trimmed.length > 0

  const model = buildSearchModel({ query, clientResults, sources, recentClients })

  // ---- Debounced, stale-guarded server search ------------------------------
  React.useEffect(() => {
    if (!trimmed) {
      setClientResults([])
      setLoading(false)
      return
    }
    const id = ++requestId.current
    setLoading(true)
    const timer = setTimeout(() => {
      searchClientsAction(trimmed)
        .then((results) => {
          if (requestId.current === id) setClientResults(results)
        })
        .finally(() => {
          if (requestId.current === id) setLoading(false)
        })
    }, 150)
    return () => clearTimeout(timer)
  }, [trimmed])

  // ---- Close on outside click ----------------------------------------------
  React.useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [open])

  // ---- ⌘K / "/" focus the search; external trigger fires a custom event ----
  const focusInput = React.useCallback(() => {
    inputRef.current?.focus()
    setOpen(true)
  }, [])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      const typingElsewhere =
        !!target &&
        target !== inputRef.current &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      const slash = e.key === "/" && !typingElsewhere
      const cmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k"
      if (slash || cmdK) {
        e.preventDefault()
        focusInput()
      }
    }
    const onFocusEvent = () => focusInput()
    window.addEventListener("keydown", onKey)
    window.addEventListener(FOCUS_EVENT, onFocusEvent)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener(FOCUS_EVENT, onFocusEvent)
    }
  }, [focusInput])

  const go = React.useCallback(
    (href: string, withTransition = false) => {
      setOpen(false)
      if (withTransition) {
        navigateWithOptionalViewTransition((to) => router.push(to), href)
      } else {
        router.push(href)
      }
    },
    [router]
  )

  const onSelect = (item: SearchItem) => {
    if (item.kind === "client") go(clientProfileHref(item.slug), true)
    else if (item.kind === "source") go("/home/sources")
    else if (item.kind === "action" && item.href) go(item.href)
  }

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      e.preventDefault()
      if (open) setOpen(false)
      else if (hasQuery) setQuery("")
    }
  }

  return (
    <div ref={wrapRef} className="relative mt-7 mb-8">
      <Command shouldFilter={false} loop>
        <div className="flex h-[46px] items-center gap-2.5 rounded-md border border-input bg-card px-3.5 transition-colors focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
          <span className="inline-flex size-4 shrink-0 items-center justify-center text-muted-foreground [&>svg]:size-4">
            <SearchIcon />
          </span>
          <CommandInput
            ref={inputRef}
            value={query}
            onValueChange={(value) => {
              setQuery(value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onInputKeyDown}
            placeholder="Search clients and sources — or type an email…"
          />
          {hasQuery ? (
            <button
              type="button"
              aria-label="Clear"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setQuery("")
                inputRef.current?.focus()
              }}
              className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-xs text-slate-300 transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </div>

        {open && (
          <div className="absolute inset-x-0 top-[calc(100%+8px)] z-40 animate-in fade-in-0 slide-in-from-top-1 rounded-lg border border-input bg-card p-1.5 shadow-[var(--shadow-3)] duration-150 ease-out">
            <CommandList className="max-h-[min(62vh,540px)]">
              {model.groups.map((group, index) => (
                <CommandGroup
                  key={group.label}
                  className={cn(
                    index > 0 && "mt-0.5 border-t border-border pt-1.5"
                  )}
                  heading={
                    <span className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.07em] text-slate-300">
                      <span>{group.label}</span>
                      {group.count && group.count > 5 ? (
                        <span className="rounded-full bg-[var(--tint-hover)] px-1.5 py-px text-[10px] tracking-normal text-muted-foreground">
                          {group.count}
                        </span>
                      ) : null}
                    </span>
                  }
                >
                  {group.items.map((item) => (
                    <SearchRow
                      key={item.key}
                      item={item}
                      onSelect={() => onSelect(item)}
                    />
                  ))}
                </CommandGroup>
              ))}

              {hasQuery && model.noResults && loading && (
                <div className="px-3.5 py-[18px] text-center text-[13px] text-muted-foreground">
                  Searching…
                </div>
              )}

              {hasQuery && model.noResults && !loading && (
                <>
                  <div className="px-3.5 pb-1 pt-[18px] text-center text-[13px] leading-[1.6] text-muted-foreground">
                    No clients or sources match “{trimmed}”.
                  </div>
                  <CommandGroup className="mt-0.5 border-t border-border pt-1.5">
                    <CommandItem
                      value="empty:all-clients"
                      className={itemClass}
                      onSelect={() => go("/home/clients")}
                    >
                      <SearchIconBox icon="users" />
                      <span className="flex min-w-0 flex-col leading-[1.3]">
                        <span className="text-[13.5px] text-foreground">
                          View all clients
                        </span>
                      </span>
                      <EnterHint />
                    </CommandItem>
                  </CommandGroup>
                </>
              )}
            </CommandList>

            <div className="mt-1 flex items-center gap-4 border-t border-border px-2.5 pb-1 pt-2 text-[11px] text-slate-300">
              <span className="inline-flex items-center gap-1.5">
                <Kbd className="size-4 min-w-4 px-1">↑</Kbd>
                <Kbd className="size-4 min-w-4 px-1">↓</Kbd> navigate
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd className="size-4 min-w-4 px-1">↵</Kbd> select
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Kbd className="h-4 px-1">esc</Kbd> dismiss
              </span>
            </div>
          </div>
        )}
      </Command>
    </div>
  )
}

function EnterHint() {
  return (
    <span className="ml-auto flex shrink-0 items-center gap-2.5">
      <span
        data-enter
        className="font-mono text-[12px] text-cobalt-500 opacity-0 transition-opacity duration-[80ms]"
      >
        ↵
      </span>
    </span>
  )
}

function SearchIconBox({
  icon,
  tone = "neutral",
  children,
}: {
  icon?: ActionIcon
  tone?: "neutral" | "cobalt"
  children?: React.ReactNode
}) {
  const Icon = icon ? ACTION_ICONS[icon] : null
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-sm",
        tone === "cobalt"
          ? "bg-cobalt-50 text-cobalt-500"
          : "bg-[var(--tint-hover)] text-muted-foreground"
      )}
    >
      {Icon ? <Icon className="size-[15px]" /> : children}
    </span>
  )
}

function SearchRow({
  item,
  onSelect,
}: {
  item: SearchItem
  onSelect: () => void
}) {
  if (item.kind === "ask") {
    return (
      <CommandItem value="ask" disabled className={itemClass}>
        <SearchIconBox icon="sparkles" tone="cobalt" />
        <span className="flex min-w-0 flex-col leading-[1.3]">
          <span className="text-[13.5px] text-foreground">
            Ask AI about your clients
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            “{item.query}”
          </span>
        </span>
        <span className="ml-auto shrink-0">
          <Badge variant="neutral">Soon</Badge>
        </span>
      </CommandItem>
    )
  }

  if (item.kind === "client") {
    return (
      <CommandItem
        value={`client:${item.key}`}
        className={itemClass}
        onSelect={onSelect}
      >
        <TonalAvatar name={item.name} size="md" />
        <span className="flex min-w-0 flex-col leading-[1.3]">
          <span className="truncate text-[13.5px] text-foreground">
            {item.name}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {item.email}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2.5">
          {item.status ? (
            <ClientStatusBadge status={item.status} />
          ) : (
            <span className="text-[12px] text-muted-foreground">
              <b className="font-medium text-foreground">{item.sources}</b>{" "}
              sources
            </span>
          )}
          <span
            data-enter
            className="font-mono text-[12px] text-cobalt-500 opacity-0 transition-opacity duration-[80ms]"
          >
            ↵
          </span>
        </span>
      </CommandItem>
    )
  }

  if (item.kind === "source") {
    return (
      <CommandItem
        value={`source:${item.key}`}
        className={itemClass}
        onSelect={onSelect}
      >
        <SearchIconBox>
          <SourceIcon icon={item.icon} className="size-[15px]" />
        </SearchIconBox>
        <span className="flex min-w-0 flex-col leading-[1.3]">
          <span className="truncate text-[13.5px] text-foreground">
            {item.title}
          </span>
          <span className="truncate font-mono text-[11px] text-muted-foreground">
            {item.sub}
          </span>
        </span>
        <span className="ml-auto flex shrink-0 items-center gap-2.5">
          {item.connected && (
            <span
              aria-hidden
              className="inline-block size-1.5 rounded-full bg-mint-500"
            />
          )}
          <span className="text-[12px] text-muted-foreground">
            {item.status}
          </span>
          <span
            data-enter
            className="font-mono text-[12px] text-cobalt-500 opacity-0 transition-opacity duration-[80ms]"
          >
            ↵
          </span>
        </span>
      </CommandItem>
    )
  }

  // action
  const ActionIconCmp = ACTION_ICONS[item.icon]
  return (
    <CommandItem
      value={`action:${item.key}`}
      disabled={item.disabled}
      className={itemClass}
      onSelect={onSelect}
    >
      <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-sm bg-[var(--tint-hover)] text-muted-foreground">
        <ActionIconCmp className="size-[15px]" />
      </span>
      <span className="flex min-w-0 flex-col leading-[1.3]">
        <span className="text-[13.5px] text-foreground">{item.label}</span>
      </span>
      <span className="ml-auto flex shrink-0 items-center gap-2.5">
        {item.soon ? (
          <Badge variant="neutral">Soon</Badge>
        ) : (
          <span
            data-enter
            className="font-mono text-[12px] text-cobalt-500 opacity-0 transition-opacity duration-[80ms]"
          >
            ↵
          </span>
        )}
      </span>
    </CommandItem>
  )
}

export { HomeSearch }
