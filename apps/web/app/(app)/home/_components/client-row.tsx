import Link from "next/link"

import { RecordRow } from "@workspace/ui/components/record-row"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"

import { ClientStatusBadge } from "@/components/client-state-badge"

import type { RecentClient } from "../_data"

function ClientRow({ client }: { client: RecentClient }) {
  return (
    <RecordRow asChild>
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
          <ClientStatusBadge status={client.status} />
        </span>
      </Link>
    </RecordRow>
  )
}

export { ClientRow }
