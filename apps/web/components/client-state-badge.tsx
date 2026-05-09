import * as React from "react"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"

import {
  clientCohortBadge,
  clientFlagBadges,
  clientStatusBadge,
  type ClientCohortBadgeSurface,
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

function ClientCohortBadge({
  cohort,
  surface = "detail",
}: {
  cohort: string
  surface?: ClientCohortBadgeSurface
}) {
  return <ClientStateBadgeView badge={clientCohortBadge(cohort, surface)} />
}

function ClientStateBadgeList({
  badges,
  empty,
}: {
  badges: ClientStateBadge[]
  empty?: React.ReactNode
}) {
  if (badges.length === 0) return empty ?? null
  return (
    <span className="inline-flex flex-wrap gap-1">
      {badges.map((badge) => (
        <ClientStateBadgeView key={`${badge.kind}-${badge.label}`} badge={badge} />
      ))}
    </span>
  )
}

function ClientFlagBadges({
  flags,
  empty,
}: {
  flags: ClientFlag[]
  empty?: React.ReactNode
}) {
  return <ClientStateBadgeList badges={clientFlagBadges(flags)} empty={empty} />
}

export {
  ClientCohortBadge,
  ClientFlagBadges,
  ClientStateBadgeList,
  ClientStateBadgeView,
  ClientStatusBadge,
}
