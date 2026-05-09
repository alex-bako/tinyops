import { PlugZapIcon, PlusIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Section, SectionHead } from "@workspace/ui/components/section"

import {
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"
import { availableSources, connectedSources } from "@/lib/sources"

import { SourceRow } from "./_components/source-row"

export default function SourcesPage() {
  const connected = connectedSources()
  const available = availableSources()

  return (
    <WorkspacePageSurface>
      <WorkspacePageHeader
        eyebrowIcon={PlugZapIcon}
        eyebrow="Workspace · data sources"
        title="Connect what you already have."
        description="TinyOps reads — never writes — from your existing tools. Each new event lands on the right client's timeline within a few minutes of arriving."
      />

      <Section className="mt-10">
        <SectionHead
          title="Connected"
          count={String(connected.length)}
          actions={
            <Button type="button" variant="tertiary" size="sm">
              <RefreshCwIcon />
              Sync all
            </Button>
          }
        />
        <div className="flex flex-col">
          {connected.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </div>
      </Section>

      <Section divider>
        <SectionHead
          title="Available"
          count={String(available.length)}
          actions={
            <Button type="button" variant="tertiary" size="sm">
              <PlusIcon />
              Request a connector
            </Button>
          }
        />
        <div className="flex flex-col">
          {available.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </div>
      </Section>
    </WorkspacePageSurface>
  )
}
