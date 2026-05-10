import type { Metadata } from "next"

import { loadClientRows } from "./_data"
import { ClientsPageClient } from "./_components/clients-page-client"

export const metadata: Metadata = {
  title: "Clients",
  description: "Everyone TinyOps knows about, in one list.",
}

export default async function ClientsPage() {
  const rows = await loadClientRows()
  return <ClientsPageClient rows={rows} />
}
