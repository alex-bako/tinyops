import type { ClientFlag, ClientStatus } from "@/lib/clients"

export type ClientBadgeKind =
  | "active"
  | "neutral"
  | "warn"
  | "sensitive"
  | "dnc"
  | "tag"

export type ClientStatusBadgeKind = "active" | "neutral" | "sensitive" | "dnc"

export type ClientStateBadge = {
  kind: ClientBadgeKind
  label: string
  dot?: boolean
}

export type ClientCohortBadgeSurface = "detail" | "tag"

export function clientStatusBadge(status: ClientStatus): ClientStateBadge & {
  kind: ClientStatusBadgeKind
} {
  if (status === "sensitive") return { kind: "sensitive", label: "Sensitive" }
  if (status === "inactive") return { kind: "neutral", label: "Inactive 90d+" }
  if (status === "dnc") return { kind: "dnc", label: "Do not contact", dot: true }
  return { kind: "active", label: "Active", dot: true }
}

export function clientFlagBadges(flags: ClientFlag[]): ClientStateBadge[] {
  const badges: ClientStateBadge[] = []
  if (flags.includes("overdue")) {
    badges.push({ kind: "warn", label: "Overdue" })
  }
  if (flags.includes("sensitive")) {
    badges.push({ kind: "sensitive", label: "Sensitive" })
  }
  if (flags.includes("idle")) {
    badges.push({ kind: "neutral", label: "Idle" })
  }
  if (flags.includes("dnc")) {
    badges.push({ kind: "dnc", label: "DNC", dot: true })
  }
  return badges
}

export function clientCohortBadge(
  cohort: string,
  surface: ClientCohortBadgeSurface = "detail"
): ClientStateBadge {
  return {
    kind: surface === "tag" ? "tag" : "neutral",
    label: cohort,
  }
}

export function clientDetailFlagBadges(flags: ClientFlag[]): ClientStateBadge[] {
  return clientFlagBadges(flags)
    .filter((badge) => badge.kind !== "dnc")
    .map((badge) => {
      if (badge.label === "Overdue") {
        return { ...badge, label: "Overdue check-in" }
      }
      if (badge.label === "Idle") {
        return { ...badge, label: "Idle 60d+" }
      }
      if (badge.label === "Sensitive") {
        return { ...badge, label: "Sensitive notes" }
      }
      return badge
    })
}
