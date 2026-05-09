import { PlugIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { DsSection, DsSectionHead } from "./ds-section"

function DangerZone({ title }: { title: string }) {
  return (
    <DsSection>
      <DsSectionHead title="Danger zone" tone="danger" />
      <div className="flex items-center gap-4 rounded-md border border-coral-500/30 bg-coral-500/5 px-4 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13.5px] font-medium text-foreground">
            Disconnect {title}
          </span>
          <span className="text-[12px] text-muted-foreground">
            Stops syncing. Imported events stay on client timelines.
          </span>
        </div>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="ml-auto"
        >
          <PlugIcon />
          Disconnect
        </Button>
      </div>
    </DsSection>
  )
}

export { DangerZone }
