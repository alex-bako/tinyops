import { ClientPropertyList } from "@/components/client-property"
import type { ClientProperty } from "@/features/clients/application/client-memory"

export function Properties({
  properties,
}: {
  properties: ClientProperty[]
}) {
  return <ClientPropertyList properties={properties} />
}
