import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeftIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { WorkspacePageSurface } from "@/components/page-surface"
import { loadConnectorDefinition } from "@/features/data-sources/loaders"

import { ConnectionBlock } from "../_components/connection-block"
import { SourceHeader } from "../_components/source-header"
import { createSourceDetailView } from "../_view-model"
import { getSourceUi } from "../source-registry"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sourceType: string }>
}): Promise<Metadata> {
  const { sourceType } = await params
  const source = loadConnectorDefinition(sourceType)
  if (!source) return { title: "Data source" }
  return {
    title: `Connect ${source.title}`,
    description: `Add a new ${source.title} data source.`,
  }
}

export default async function NewSourcePage({
  params,
}: {
  params: Promise<{ sourceType: string }>
}) {
  const { sourceType } = await params
  const source = loadConnectorDefinition(sourceType)
  if (!source) notFound()

  const sourceUi = getSourceUi(source.id)
  const view = createSourceDetailView(source, sourceUi)

  return (
    <WorkspacePageSurface>
      <div className="mb-[18px]">
        <Button asChild variant="tertiary" size="sm">
          <Link href="/home/sources">
            <ArrowLeftIcon />
            Back to all sources
          </Link>
        </Button>
      </div>

      <SourceHeader header={view.header} actions={view.actions} />
      <ConnectionBlock source={source} sourceUi={sourceUi} />
    </WorkspacePageSurface>
  )
}
