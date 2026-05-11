"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { ChevronRightIcon, SearchXIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/table"
import { cn } from "@workspace/ui/lib/utils"

import { ClientIdentityLink } from "@/components/client-identity"
import {
  ClientCohortBadge,
  ClientFlagBadges,
  ClientStatusBadge,
} from "@/components/client-state-badge"
import type { ClientDetail } from "@/features/clients/application/client-memory"
import { navigateWithOptionalViewTransition } from "@/lib/view-transition-navigation"
import {
  clientProfileHref,
  clientProfileViewTransitionName,
} from "../_profile-routing"

export function ClientsTable({
  rows,
  emptyMessage,
  onClear,
  newlyInsertedSlugs,
}: {
  rows: ClientDetail[]
  emptyMessage: string
  onClear: () => void
  newlyInsertedSlugs?: ReadonlySet<string>
}) {
  const { push } = useRouter()
  return (
    <Table className="mt-0">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead className="w-[30%]">Name</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Cohort</TableHead>
          <TableHead className="text-right">Sources</TableHead>
          <TableHead>Last contact</TableHead>
          <TableHead>Last event</TableHead>
          <TableHead>Flags</TableHead>
          <TableHead className="w-[60px]" aria-hidden />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={8} className="border-b border-border">
              <div
                data-motion-safe-fade=""
                className={cn(
                  "flex items-center justify-center gap-2.5 px-3 py-9 text-[13px] text-muted-foreground"
                )}
              >
                <SearchXIcon className="size-4 text-muted-foreground/60" />
                <span>{emptyMessage}</span>
                <Button variant="tertiary" size="sm" onClick={onClear}>
                  Clear filters
                </Button>
              </div>
            </td>
          </tr>
        ) : (
          rows.map((c) => {
            const href = clientProfileHref(c.slug)
            const justInserted = newlyInsertedSlugs?.has(c.slug)
            const navigate = () => {
              navigateWithOptionalViewTransition(push, href)
            }
            return (
            <TableRow
              key={c.slug}
              interactive
              data-just-inserted={justInserted ? "" : undefined}
              className="cursor-pointer"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest("a")) return
                navigate()
              }}
            >
              <TableCell>
                <span
                  style={{
                    viewTransitionName: clientProfileViewTransitionName(c.slug),
                  }}
                  className="inline-flex"
                >
                  <ClientIdentityLink
                    href={href}
                    className="-m-1 flex min-w-0 items-center gap-2.5 rounded-sm p-1 no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring"
                    name={c.name}
                    email={c.email}
                    detailsClassName="leading-[1.2]"
                    nameClassName="text-[13.5px] font-medium tracking-[-0.005em]"
                    emailClassName="text-[11px]"
                  />
                </span>
              </TableCell>
              <TableCell>
                <ClientStatusBadge status={c.status} />
              </TableCell>
              <TableCell>
                <ClientCohortBadge cohort={c.cohort} surface="tag" />
              </TableCell>
              <TableCell className="text-right font-mono text-[12.5px] tabular-nums text-foreground">
                {c.sources}
              </TableCell>
              <TableCell className="font-mono text-[12px] tabular-nums whitespace-nowrap text-muted-foreground">
                {c.lastContact}
              </TableCell>
              <TableCell className="font-mono text-[12px] tabular-nums whitespace-nowrap text-muted-foreground">
                {c.lastEvent}
              </TableCell>
              <TableCell>
                <ClientFlagBadges
                  flags={c.flags}
                  empty={
                    <span className="font-mono text-[11.5px] text-muted-foreground/50">
                      -
                    </span>
                  }
                />
              </TableCell>
              <TableCell className="w-[60px] text-right">
                <span
                  aria-hidden
                  className={cn(
                    "inline-flex -translate-x-0.5 text-muted-foreground/50 opacity-0 transition duration-(--dur-fast) ease-(--ease-out)",
                    "group-hover/row:translate-x-0 group-hover/row:opacity-100"
                  )}
                >
                  <ChevronRightIcon className="size-3.5" />
                </span>
              </TableCell>
            </TableRow>
            )
          })
        )}
      </TableBody>
    </Table>
  )
}
