import type { DataSource } from "@/lib/sources"
import type { SourceUiRegistryEntry } from "../source-registry"

import { sourceAdapterKey } from "./source-adapter-key"

function ConfigBlock({
  source,
  sourceUi,
}: {
  source: DataSource
  sourceUi: SourceUiRegistryEntry
}) {
  const Config = sourceUi.Config

  return <Config key={sourceAdapterKey(source)} source={source} />
}

export { ConfigBlock }
