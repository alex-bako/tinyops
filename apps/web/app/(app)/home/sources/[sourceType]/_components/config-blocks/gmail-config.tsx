import type { DataSource } from "@/lib/sources"

import { DsSection, DsSectionHead } from "../ds-section"

function GmailConfig({ source }: { source: DataSource }) {
  if (!source.connected) {
    return (
      <DsSection>
        <DsSectionHead
          title="What to import"
          hint="Connect Gmail to start importing email into client timelines."
        />
        <p className="m-0 mt-1 text-[13px] text-muted-foreground">
          Configuration becomes available once Gmail is connected.
        </p>
      </DsSection>
    )
  }

  return (
    <DsSection>
      <DsSectionHead
        title="What to import"
        hint="TinyOps imports read-only email from your watched Gmail labels."
      />
      <p className="m-0 mt-1 text-[13px] text-muted-foreground">
        Watching the <span className="font-medium text-foreground">Inbox</span>{" "}
        and <span className="font-medium text-foreground">Sent</span> labels.
        Reconnect from the connection panel to refresh access.
      </p>
    </DsSection>
  )
}

export { GmailConfig }
