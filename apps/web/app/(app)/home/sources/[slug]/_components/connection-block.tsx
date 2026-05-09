import type { DataSource } from "@/lib/sources"
import type { SourceUiRegistryEntry } from "../source-registry"

import { AuthChip } from "./auth-chip"
import { DsSection, DsSectionHead } from "./ds-section"
import { sourceAdapterKey } from "./source-adapter-key"

function ConnectionBlock({
  source,
  sourceUi,
}: {
  source: DataSource
  sourceUi: SourceUiRegistryEntry
}) {
  const Connection = sourceUi.Connection

  return (
    <DsSection>
      <DsSectionHead title="Connection" actions={<AuthChip auth={source.auth} />} />
      <Connection key={sourceAdapterKey(source)} source={source} />
    </DsSection>
  )
}

export { ConnectionBlock }
