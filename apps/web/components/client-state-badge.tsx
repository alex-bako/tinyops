import * as React from "react"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"

import {
  clientFlagBadges,
  clientStatusBadge,
  type ClientStateBadge,
} from "@/lib/client-state"
import type { ClientFlag, ClientStatus } from "@/lib/clients"

function ClientStateBadgeView({ badge }: { badge: ClientStateBadge }) {
  return (
    <Badge variant={badge.kind}>
      {badge.dot ? <BadgeDot /> : null}
      {badge.label}
    </Badge>
  )
}

function ClientStatusBadge({ status }: { status: ClientStatus }) {
  return <ClientStateBadgeView badge={clientStatusBadge(status)} />
}

function ClientFlagBadges({
  flags,
  empty,
}: {
  flags: ClientFlag[]
  empty?: React.ReactNode
}) {
  const badges = clientFlagBadges(flags)
  if (badges.length === 0) return empty ?? null
  return (
    <span className="inline-flex flex-wrap gap-1">
      {badges.map((badge) => (
        <ClientStateBadgeView key={`${badge.kind}-${badge.label}`} badge={badge} />
      ))}
    </span>
  )
}

export { ClientStateBadgeView, ClientStatusBadge, ClientFlagBadges }
