import { DsSection, DsSectionHead } from "../ds-section"

function TeachableConfig() {
  return (
    <DsSection>
      <DsSectionHead
        title="What to import"
        hint="Connect with an API key to choose schools, courses, and progress events."
      />
      <p className="m-0 mt-1 text-[13px] text-muted-foreground">
        Configuration becomes available once Teachable is connected.
      </p>
    </DsSection>
  )
}

export { TeachableConfig }
