import { Badge, BadgeDot } from "@workspace/ui/components/badge"

import type { ClientPropertyValue } from "@/features/clients/application/client-memory"

function PropertyTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-0.5 inline-block rounded-xs bg-[var(--tint-active)] px-[7px] py-px text-[12px] text-foreground/80">
      {children}
    </span>
  )
}

function EmptyValue() {
  return <span className="text-[13.5px] italic text-muted-foreground/60">Empty</span>
}

/** Renders a property value the way a resting row shows it (read-only). */
export function PropertyValueView({ value }: { value: ClientPropertyValue }) {
  if (value.kind === "status") {
    if (!value.label) return <EmptyValue />
    return (
      <Badge variant={value.statusKind}>
        <BadgeDot />
        {value.label}
      </Badge>
    )
  }

  if (value.kind === "tags") {
    if (value.values.length === 0) return <EmptyValue />
    return (
      <span className="flex flex-wrap items-center gap-1">
        {value.values.map((tag) => (
          <PropertyTag key={tag}>{tag}</PropertyTag>
        ))}
      </span>
    )
  }

  // text | date
  if (!value.text) return <EmptyValue />
  return (
    <span className="text-[13.5px] leading-[1.55] text-foreground">
      {value.text}
    </span>
  )
}
