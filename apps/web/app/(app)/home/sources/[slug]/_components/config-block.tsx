import type { DataSource } from "@/lib/sources"
import type { SourceUiRegistryEntry } from "../source-registry"

function ConfigBlock({
  source,
  sourceUi,
}: {
  source: DataSource
  sourceUi: SourceUiRegistryEntry
}) {
  const Config = sourceUi.Config

  return <Config source={source} />
}

export { ConfigBlock }
