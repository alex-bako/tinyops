import Link from "next/link"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"

import type { RecentClient } from "../_data"
import { NotionRow } from "./notion-row"

function StatusBadge({ status }: { status: RecentClient["status"] }) {
  if (status === "sensitive") return <Badge variant="sensitive">Sensitive</Badge>
  if (status === "inactive") return <Badge variant="neutral">Inactive 90d+</Badge>
  if (status === "dnc")
    return (
      <Badge variant="dnc">
        <BadgeDot />
        Do not contact
      </Badge>
    )
  return (
    <Badge variant="active">
      <BadgeDot />
      Active
    </Badge>
  )
}

function ClientRow({ client }: { client: RecentClient }) {
  return (
    <NotionRow asChild>
      <Link href={`/home/clients/${client.slug}`}>
        <TonalAvatar size="md" name={client.name} />
        <div className="flex min-w-0 flex-col leading-[1.25]">
          <span className="text-[14px] text-foreground">{client.name}</span>
          <span className="font-mono text-[11.5px] text-muted-foreground">
            {client.email}
          </span>
        </div>
        <span className="ml-auto flex items-center gap-3 text-[12.5px] text-muted-foreground">
          <span>
            <b className="font-medium text-foreground">{client.sources}</b>{" "}
            sources
          </span>
          <span>{client.lastEvent}</span>
          <StatusBadge status={client.status} />
        </span>
      </Link>
    </NotionRow>
  )
}

export { ClientRow }
