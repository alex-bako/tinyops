import type { Metadata } from "next"

import { loadWorkspaceSourceCatalog } from "@/features/data-sources/loaders"
import { loadHomePageData } from "./_data"
import { loadClientRows } from "./clients/_data"
import { ClientsPageClient } from "./clients/_components/clients-page-client"

export const metadata: Metadata = {
  title: "Home",
  description: "Everyone TinyOps knows about, in one list.",
}

export default async function HomePage() {
  const sourceCatalog = await loadWorkspaceSourceCatalog()
  const [rows, { recentClients, homeSources }] = await Promise.all([
    loadClientRows(),
    loadHomePageData(undefined, sourceCatalog),
  ])

  return (
    <ClientsPageClient
      rows={rows}
      recentClients={recentClients.map((c) => ({
        slug: c.slug,
        name: c.name,
        email: c.email,
        status: c.status,
      }))}
      sources={homeSources}
    />
  )
}
