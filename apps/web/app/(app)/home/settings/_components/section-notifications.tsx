"use client"

import * as React from "react"

import { Switch } from "@workspace/ui/components/switch"

type NotificationItem = {
  id: string
  label: string
  sub: string
  on: boolean
}

const ITEMS: NotificationItem[] = [
  {
    id: "digest",
    label: "Daily digest of pending drafts",
    sub: "Sent every morning at 8:00 in your time zone.",
    on: true,
  },
  {
    id: "sensitive",
    label: "Sensitive items flagged for review",
    sub: "Real-time email when something needs you.",
    on: true,
  },
  {
    id: "sync_fail",
    label: "Data source sync failure",
    sub: "Email when a connector falls behind.",
    on: true,
  },
  {
    id: "weekly",
    label: "Weekly cohort report",
    sub: "Saturday morning summary.",
    on: false,
  },
  {
    id: "members",
    label: "Member changes",
    sub: "When someone joins, leaves, or changes role.",
    on: true,
  },
  {
    id: "billing",
    label: "Billing & plan updates",
    sub: "Receipts, plan changes, seat overages.",
    on: true,
  },
]

export function SectionNotifications() {
  const [state, setState] = React.useState<Record<string, boolean>>(
    () => Object.fromEntries(ITEMS.map((it) => [it.id, it.on]))
  )

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground">
          Notifications
        </h2>
        <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          What this workspace emails you about. Per-member preferences override
          these defaults.
        </p>
      </div>
      <div className="flex flex-col">
        {ITEMS.map((it) => (
          <div
            key={it.id}
            className="flex items-center gap-4 border-b border-border py-3.5 last:border-b-0"
          >
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="text-[13.5px] font-medium text-foreground">
                {it.label}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {it.sub}
              </span>
            </div>
            <Switch
              checked={!!state[it.id]}
              onCheckedChange={(v) =>
                setState((prev) => ({ ...prev, [it.id]: v }))
              }
            />
          </div>
        ))}
      </div>
    </div>
  )
}
