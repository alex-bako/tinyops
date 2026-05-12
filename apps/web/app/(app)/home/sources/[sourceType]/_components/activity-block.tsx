import { Button } from "@workspace/ui/components/button"

import { DsSection, DsSectionHead } from "./ds-section"
import type { SourceActivityRow } from "../_view-model"

function ActivityBlock({ activity }: { activity: SourceActivityRow[] }) {
  return (
    <DsSection>
      <DsSectionHead
        title="Recent activity"
        actions={
          <Button type="button" variant="tertiary" size="sm">
            View all
          </Button>
        }
      />
      <div className="flex flex-col">
        {activity.map((row) => (
          <div
            key={`${row.when}-${row.what}`}
            className="grid grid-cols-[110px_minmax(0,1fr)] gap-4 border-b border-border py-2.5 text-[13px] last:border-b-0"
          >
            <span className="pt-px font-mono text-[11.5px] text-muted-foreground">
              {row.when}
            </span>
            <span className="text-foreground">{row.what}</span>
          </div>
        ))}
      </div>
    </DsSection>
  )
}

export { ActivityBlock }
