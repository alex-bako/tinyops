import { ClientPropertyList } from "@/components/client-property"
import type { ClientProperty } from "@/lib/clients"

export function Properties({
  properties,
}: {
  properties: ClientProperty[]
}) {
  return <ClientPropertyList properties={properties} />
}
