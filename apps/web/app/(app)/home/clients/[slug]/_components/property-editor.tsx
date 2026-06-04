"use client"

import * as React from "react"
import { CheckIcon, PlusIcon, Trash2Icon, XIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { cn } from "@workspace/ui/lib/utils"

import {
  PROPERTY_ICON_CHOICES,
  PROPERTY_TYPE_META,
  PROPERTY_TYPE_ORDER,
  PropertyIconView,
} from "@/components/property-icon"
import type {
  ClientProperty,
  ClientPropertyValue,
  PropertyIcon,
  PropertyStatusKind,
  PropertyType,
} from "@/features/clients/application/client-memory"

import type { PropertyInput } from "./use-property-collection"

const STATUS_SWATCHES: { kind: PropertyStatusKind; title: string; className: string }[] = [
  { kind: "active", title: "Green", className: "bg-mint-500/15 text-mint-700" },
  { kind: "warn", title: "Lime", className: "bg-citron-300/45 text-citron-700" },
  { kind: "brand", title: "Blue", className: "bg-cobalt-500/15 text-cobalt-700" },
  { kind: "neutral", title: "Gray", className: "bg-[var(--tint-active)] text-muted-foreground" },
]

type Draft = {
  name: string
  icon: PropertyIcon
  type: PropertyType
  value: ClientPropertyValue
  iconTouched: boolean
}

function initialDraft(property: ClientProperty | null): Draft {
  if (property) {
    return {
      name: property.name,
      icon: property.icon,
      type: property.type,
      value: property.value,
      iconTouched: true,
    }
  }
  return {
    name: "",
    icon: PROPERTY_TYPE_META.text.icon,
    type: "text",
    value: { kind: "text", text: "" },
    iconTouched: false,
  }
}

/** Best-effort carry of a value across a type switch (mirrors the design kit). */
function convertValue(value: ClientPropertyValue, type: PropertyType): ClientPropertyValue {
  if (type === "tags") {
    if (value.kind === "tags") return value
    if (value.kind === "status") return { kind: "tags", values: value.label ? [value.label] : [] }
    return { kind: "tags", values: value.text ? [value.text] : [] }
  }
  if (type === "status") {
    if (value.kind === "status") return value
    const label = value.kind === "tags" ? value.values.join(", ") : value.text
    return { kind: "status", statusKind: "active", label: label || "Active" }
  }
  // text | date
  const text =
    value.kind === "tags"
      ? value.values.join(", ")
      : value.kind === "status"
        ? value.label
        : value.text
  return type === "date" ? { kind: "date", text } : { kind: "text", text }
}

function TagInput({
  values,
  onChange,
}: {
  values: string[]
  onChange: (next: string[]) => void
}) {
  const [draft, setDraft] = React.useState("")
  const add = () => {
    const tag = draft.trim()
    if (tag && !values.includes(tag)) onChange([...values, tag])
    setDraft("")
  }
  return (
    <div className="flex min-h-[38px] flex-wrap items-center gap-1.5 rounded-sm border border-[var(--rule-strong)] bg-card px-2 py-1.5 focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/15">
      {values.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 rounded-xs bg-[var(--tint-active)] py-0.5 pr-1 pl-2 text-[12.5px] text-foreground/80"
        >
          {tag}
          <button
            type="button"
            aria-label={`Remove ${tag}`}
            className="inline-flex rounded-xs p-px text-muted-foreground/60 hover:bg-[var(--tint-active)] hover:text-foreground"
            onClick={() => onChange(values.filter((entry) => entry !== tag))}
          >
            <XIcon className="size-[11px]" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        placeholder={values.length ? "Add another…" : "Type and press Enter…"}
        className="min-w-[90px] flex-1 border-none bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground/60"
        onChange={(event) => setDraft(event.target.value)}
        onBlur={add}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === ",") {
            event.preventDefault()
            add()
          } else if (event.key === "Backspace" && !draft && values.length) {
            onChange(values.slice(0, -1))
          }
        }}
      />
    </div>
  )
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
      {children}
    </span>
  )
}

export function PropertyEditor({
  mode,
  property,
  onSubmit,
  onCancel,
  onDelete,
}: {
  mode: "add" | "edit"
  property: ClientProperty | null
  onSubmit: (input: PropertyInput) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const [draft, setDraft] = React.useState<Draft>(() => initialDraft(property))

  const valid = draft.name.trim().length > 0
  const set = (patch: Partial<Draft>) => setDraft((prev) => ({ ...prev, ...patch }))

  const changeType = (type: PropertyType) => {
    set({
      type,
      value: convertValue(draft.value, type),
      icon: draft.iconTouched ? draft.icon : PROPERTY_TYPE_META[type].icon,
    })
  }

  const commit = () => {
    if (!valid) return
    onSubmit({ name: draft.name.trim(), icon: draft.icon, type: draft.type, value: draft.value })
  }

  return (
    <div
      className="my-1.5 flex flex-col gap-3.5 rounded-md border border-[var(--rule-strong)] bg-card p-3.5 shadow-[var(--shadow-2)]"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault()
          onCancel()
        }
      }}
    >
      <div className="grid grid-cols-[minmax(180px,1fr)_auto] items-start gap-3.5">
        <label className="flex flex-col gap-1.5">
          <FieldLabel>Name</FieldLabel>
          <Input
            autoFocus
            value={draft.name}
            placeholder="Property name"
            onChange={(event) => set({ name: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault()
                commit()
              }
            }}
          />
        </label>
        <div className="flex flex-col gap-1.5">
          <FieldLabel>Type</FieldLabel>
          <div className="inline-flex gap-0.5 rounded-sm bg-[var(--tint-active)] p-0.5" role="tablist">
            {PROPERTY_TYPE_ORDER.map((type) => {
              const on = draft.type === type
              return (
                <button
                  key={type}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => changeType(type)}
                  className={cn(
                    "inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs px-2.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:text-foreground",
                    on && "bg-card text-foreground shadow-[var(--shadow-1)]"
                  )}
                >
                  <PropertyIconView icon={PROPERTY_TYPE_META[type].icon} className="size-[13px] opacity-80" />
                  {PROPERTY_TYPE_META[type].label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Value</FieldLabel>
        {draft.value.kind === "tags" ? (
          <TagInput
            values={draft.value.values}
            onChange={(values) => set({ value: { kind: "tags", values } })}
          />
        ) : null}
        {draft.value.kind === "status" ? (
          <div className="flex flex-col gap-2">
            <Input
              value={draft.value.label}
              placeholder="Status label"
              onChange={(event) =>
                set({
                  value: {
                    kind: "status",
                    statusKind: draft.value.kind === "status" ? draft.value.statusKind : "active",
                    label: event.target.value,
                  },
                })
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commit()
                }
              }}
            />
            <div className="flex gap-1.5">
              {STATUS_SWATCHES.map((swatch) => {
                const on = draft.value.kind === "status" && draft.value.statusKind === swatch.kind
                return (
                  <button
                    key={swatch.kind}
                    type="button"
                    title={swatch.title}
                    onClick={() =>
                      set({
                        value: {
                          kind: "status",
                          statusKind: swatch.kind,
                          label: draft.value.kind === "status" ? draft.value.label : "",
                        },
                      })
                    }
                    className={cn(
                      "inline-flex size-[26px] items-center justify-center rounded-sm border-[1.5px] border-transparent",
                      swatch.className,
                      on && "border-foreground"
                    )}
                  >
                    {on ? <CheckIcon className="size-[11px]" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
        {draft.value.kind === "text" || draft.value.kind === "date" ? (
          draft.value.kind === "date" ? (
            <Input
              value={draft.value.text}
              placeholder="e.g. Feb 12, 2026"
              onChange={(event) => set({ value: { kind: "date", text: event.target.value } })}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault()
                  commit()
                }
              }}
            />
          ) : (
            <Textarea
              rows={2}
              value={draft.value.text}
              placeholder="Add a value…"
              onChange={(event) => set({ value: { kind: "text", text: event.target.value } })}
              onKeyDown={(event) => {
                if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                  event.preventDefault()
                  commit()
                }
              }}
            />
          )
        ) : null}
      </div>

      <div className="flex flex-col gap-1.5">
        <FieldLabel>Icon</FieldLabel>
        <div className="flex flex-wrap gap-1">
          {PROPERTY_ICON_CHOICES.map((icon) => {
            const on = draft.icon === icon
            return (
              <button
                key={icon}
                type="button"
                aria-label={icon}
                onClick={() => set({ icon, iconTouched: true })}
                className={cn(
                  "inline-flex size-[30px] items-center justify-center rounded-sm border border-[var(--rule)] bg-card text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground",
                  on && "border-cobalt-500 bg-cobalt-500/10 text-cobalt-700"
                )}
              >
                <PropertyIconView icon={icon} />
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {mode === "edit" ? (
          <Button variant="destructive" size="sm" onClick={onDelete}>
            <Trash2Icon />
            Delete
          </Button>
        ) : (
          <span className="text-[12px] text-muted-foreground/60">
            <kbd className="font-mono">esc</kbd> to cancel
          </span>
        )}
        <div className="ml-auto flex gap-1.5">
          <Button variant="tertiary" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" disabled={!valid} onClick={commit}>
            {mode === "edit" ? <CheckIcon /> : <PlusIcon />}
            {mode === "edit" ? "Save changes" : "Add property"}
          </Button>
        </div>
      </div>
    </div>
  )
}
