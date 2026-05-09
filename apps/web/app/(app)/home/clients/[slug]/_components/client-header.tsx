import {
  AtSignIcon,
  CopyIcon,
  EyeOffIcon,
  MapPinIcon,
  PlusIcon,
  SendIcon,
} from "lucide-react"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"
import { cn } from "@workspace/ui/lib/utils"

import type { ClientBadge, ClientDetail } from "@/lib/clients"

function HeaderBadge({ badge }: { badge: ClientBadge }) {
  if (badge.kind === "active")
    return (
      <Badge variant="active">
        <BadgeDot />
        {badge.label}
      </Badge>
    )
  if (badge.kind === "dnc")
    return (
      <Badge variant="dnc">
        <BadgeDot />
        {badge.label}
      </Badge>
    )
  if (badge.kind === "sensitive")
    return <Badge variant="sensitive">{badge.label}</Badge>
  if (badge.kind === "warn") return <Badge variant="warn">{badge.label}</Badge>
  if (badge.kind === "tag") return <Badge variant="tag">{badge.label}</Badge>
  return <Badge variant="neutral">{badge.label}</Badge>
}

export function ClientHeader({ client }: { client: ClientDetail }) {
  return (
    <div
      className={cn(
        "mb-8 flex items-start gap-[18px] border-b border-border pb-6"
      )}
    >
      <TonalAvatar size="lg" name={client.name} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h1
          className={cn(
            "font-sans text-[32px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground"
          )}
        >
          {client.name}
        </h1>
        <div
          className={cn(
            "flex items-center gap-2 font-mono text-[12.5px] text-muted-foreground"
          )}
        >
          <AtSignIcon className="size-[13px]" />
          <span>{client.email}</span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <MapPinIcon className="size-[13px]" />
          <span>{client.location}</span>
        </div>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {client.badges.map((b) => (
            <HeaderBadge key={`${b.kind}-${b.label}`} badge={b} />
          ))}
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-1">
        <Button variant="ghost" size="sm">
          <PlusIcon />
          Add note
        </Button>
        <Button variant="ghost" size="sm">
          <EyeOffIcon />
          Do not contact
        </Button>
        <Button variant="secondary" size="sm">
          <CopyIcon />
          Copy email
        </Button>
        <Button variant="primary" size="sm">
          <SendIcon />
          Draft email
        </Button>
      </div>
    </div>
  )
}
