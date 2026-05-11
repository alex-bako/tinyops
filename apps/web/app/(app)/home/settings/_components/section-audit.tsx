"use client"

import * as React from "react"
import {
  CheckIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  SparklesIcon,
  Trash2Icon,
  UserPlusIcon,
  type LucideIcon,
} from "lucide-react"

type AuditEvent = {
  when: string
  actor: string
  what: string
  icon: LucideIcon
}

const EVENTS: AuditEvent[] = [
  {
    when: "2m ago",
    actor: "Jamie Park",
    what: "Switched sensitivity to Strict mode.",
    icon: ShieldCheckIcon,
  },
  {
    when: "1h ago",
    actor: "Devon Nguyen",
    what: "Invited alex@replaylab.com as Operator.",
    icon: UserPlusIcon,
  },
  {
    when: "Yesterday",
    actor: "Sara Berger",
    what: "Approved 47 drafts in March cohort.",
    icon: CheckIcon,
  },
  {
    when: "2d ago",
    actor: "Jamie Park",
    what: "Connected IMAP mailbox hello@yourpractice.com.",
    icon: PlugZapIcon,
  },
  {
    when: "5d ago",
    actor: "Devon Nguyen",
    what: "Removed legacy CSV upload (february-cohort.csv).",
    icon: Trash2Icon,
  },
  {
    when: "1w ago",
    actor: "Jamie Park",
    what: "Created workspace.",
    icon: SparklesIcon,
  },
]

export function SectionAudit() {
  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
          Audit log
        </h2>
        <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          Every change made to this workspace. Retained for 365 days.
        </p>
      </div>
      <div className="flex flex-col">
        {EVENTS.map((e) => {
          const Icon = e.icon
          return (
            <div
              key={`${e.when}:${e.actor}:${e.what}`}
              className="grid grid-cols-[84px_24px_140px_1fr] items-center gap-3 border-b border-border px-1 py-2.5 text-[13px] last:border-b-0"
            >
              <span className="font-mono text-[11.5px] text-muted-foreground">
                {e.when}
              </span>
              <span className="inline-flex items-center text-muted-foreground">
                <Icon className="size-3.5" />
              </span>
              <span className="text-[13px] font-medium text-foreground">
                {e.actor}
              </span>
              <span className="text-[13px] leading-[1.5] text-muted-foreground">
                {e.what}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
