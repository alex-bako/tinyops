import { RecordRow } from "@workspace/ui/components/record-row"

import { ClientIdentityLink } from "@/components/client-identity"
import { ClientStatusBadge } from "@/components/client-state-badge"

import type { RecentClient } from "../_data"

function ClientRow({ client }: { client: RecentClient }) {
  return (
    <RecordRow asChild>
      <ClientIdentityLink
        href={`/home/clients/${client.slug}`}
        name={client.name}
        email={client.email}
      >
        <span className="ml-auto flex items-center gap-3 text-[12.5px] text-muted-foreground">
          <span>
            <b className="font-medium text-foreground">{client.sources}</b>{" "}
            sources
          </span>
          <span>{client.lastEvent}</span>
          <ClientStatusBadge status={client.status} />
        </span>
      </ClientIdentityLink>
    </RecordRow>
  )
}

export { ClientRow }
