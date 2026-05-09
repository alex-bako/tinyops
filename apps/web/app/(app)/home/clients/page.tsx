import { loadClientRows } from "./_data"
import { ClientsPageClient } from "./_components/clients-page-client"

export default async function ClientsPage() {
  const rows = await loadClientRows()
  return <ClientsPageClient rows={rows} />
}
