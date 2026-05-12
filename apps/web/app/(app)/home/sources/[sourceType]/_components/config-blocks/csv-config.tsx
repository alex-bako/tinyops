"use client"

import { Form, FormRow } from "@workspace/ui/components/form-row"

import { DsSection, DsSectionHead } from "../ds-section"
import { MapRow } from "../map-row"
import { SegmentedControl } from "../segmented-control"

function CsvConfig() {
  return (
    <DsSection>
      <DsSectionHead
        title="Column mapping"
        hint="How columns in the CSV map onto client properties."
      />
      <Form>
        <div className="flex flex-col gap-1">
          <MapRow csv="email" prop="email" />
          <MapRow csv="full_name" prop="name" />
          <MapRow csv="signed_up_at" prop="created_at" />
          <MapRow csv="cohort" prop="tag · cohort" />
          <MapRow csv="plan" prop="tag · plan" />
          <MapRow csv="ssn" prop="ignore (sensitive)" warn />
        </div>
        <FormRow label="On duplicates">
          <SegmentedControl
            ariaLabel="On duplicates"
            defaultValue="merge"
            options={[
              { value: "skip", label: "Skip" },
              { value: "merge", label: "Merge into existing" },
              { value: "new", label: "Create new client" },
            ]}
          />
        </FormRow>
      </Form>
    </DsSection>
  )
}

export { CsvConfig }
