import { DsSection, DsSectionHead } from "../ds-section"

function CalendlyConfig() {
  return (
    <DsSection>
      <DsSectionHead
        title="What to import"
        hint="Connect Calendly to choose event types and booking sources."
      />
      <p className="m-0 mt-1 text-[13px] text-muted-foreground">
        Configuration becomes available once Calendly is connected.
      </p>
    </DsSection>
  )
}

export { CalendlyConfig }
