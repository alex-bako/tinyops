"use client"

import * as React from "react"
import {
  ArrowUpRightIcon,
  CreditCardIcon,
  DownloadIcon,
  FileTextIcon,
} from "lucide-react"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { Meter } from "@workspace/ui/components/meter"

import type {
  Workspace,
  WorkspaceUsageSnapshot,
} from "@/features/workspaces/types"

const INVOICES = [
  { date: "May 1, 2026", amount: "$89.00", status: "Paid" },
  { date: "Apr 1, 2026", amount: "$89.00", status: "Paid" },
  { date: "Mar 1, 2026", amount: "$89.00", status: "Paid" },
]

export function SectionBilling({
  workspace,
  usage,
}: {
  workspace: Workspace
  usage: WorkspaceUsageSnapshot
}) {
  const { plan, members } = workspace
  const { counts } = usage
  const seatsUsed = members.length

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] text-foreground">
          Plan &amp; billing
        </h2>
        <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          Visible only to the workspace owner. Receipts go to
          jamie@yourpractice.com.
        </p>
      </div>

      <div className="rounded-md border border-border bg-background p-5">
        <div className="mb-3.5 flex items-baseline gap-3 border-b border-border pb-3.5">
          <span className="font-sans text-[22px] font-semibold tracking-[-0.02em] text-foreground">
            {plan.tier}
          </span>
          <span className="ml-auto font-mono text-[13px] text-muted-foreground">
            {plan.price}
          </span>
        </div>
        <div className="flex flex-col gap-3.5">
          <Meter
            label="Members"
            value={`${seatsUsed} / ${plan.seats}`}
            fraction={seatsUsed / plan.seats}
          />
          <Meter
            label="Clients tracked"
            value={`${counts.clients.toLocaleString()} / 5,000`}
            fraction={counts.clients / 5000}
          />
          <Meter
            label="Drafts this month"
            value="312 / 2,000"
            fraction={0.156}
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button variant="primary" size="sm">
            <ArrowUpRightIcon />
            Upgrade plan
          </Button>
          <Button variant="secondary" size="sm">
            <CreditCardIcon />
            Update card
          </Button>
          <Button variant="ghost" size="sm">
            <FileTextIcon />
            Download invoices
          </Button>
        </div>
      </div>

      <div className="mt-7 mb-3 text-[12px] font-medium tracking-[0.05em] text-muted-foreground uppercase">
        Recent invoices
      </div>
      <div className="flex flex-col">
        {INVOICES.map((i) => (
          <div
            key={i.date}
            className="grid grid-cols-[130px_100px_auto_32px] items-center gap-4 border-b border-border px-1 py-2.5 text-[13px] last:border-b-0"
          >
            <span className="font-mono text-[12px] text-foreground">
              {i.date}
            </span>
            <span className="font-mono text-[12px] text-foreground tabular-nums">
              {i.amount}
            </span>
            <Badge variant="active">
              <BadgeDot />
              {i.status}
            </Badge>
            <button
              type="button"
              aria-label={`Download invoice for ${i.date}`}
              className="inline-flex size-7 items-center justify-center rounded-xs text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
            >
              <DownloadIcon className="size-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
