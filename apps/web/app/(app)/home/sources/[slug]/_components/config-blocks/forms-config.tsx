"use client"

import { Form, FormRow } from "@workspace/ui/components/form-row"

import { ChipPicker } from "../chip-picker"
import { DsSection, DsSectionHead } from "../ds-section"
import { FormsListItem } from "../forms-list-item"
import { SegmentedControl } from "../segmented-control"

const SENSITIVE_TOPICS = [
  { id: "medication", label: "medication" },
  { id: "diagnosis", label: "diagnosis" },
  { id: "minor", label: "minor" },
  { id: "income", label: "income" },
]

function FormsConfig() {
  return (
    <DsSection>
      <DsSectionHead
        title="Forms to sync"
        hint="Pick which Forms in this Google account land on client timelines."
      />
      <Form>
        <FormRow label="Selected forms">
          <div className="flex flex-col gap-0.5">
            <FormsListItem
              name="Practice intake — 2026"
              meta="142 responses · all-time"
              defaultChecked
            />
            <FormsListItem
              name="Monthly check-in"
              meta="61 responses · last 30d"
              defaultChecked
            />
            <FormsListItem
              name="Course feedback (Cohort 4)"
              meta="38 responses · last 30d"
            />
            <FormsListItem
              name="Internal team retro"
              meta="12 responses · last 30d"
              muted
            />
          </div>
        </FormRow>
        <FormRow label="Match responses to clients by">
          <SegmentedControl
            ariaLabel="Match responses by"
            defaultValue="email"
            options={[
              { value: "email", label: "Email field" },
              { value: "name", label: "Name field" },
              { value: "custom", label: "Custom column" },
            ]}
          />
        </FormRow>
        <FormRow
          label="Mark sensitive when answer contains"
          help="Flag any response touching these topics so it never auto-drafts replies."
        >
          <ChipPicker
            items={SENSITIVE_TOPICS}
            defaultValue={["medication", "diagnosis", "minor"]}
            mono
          />
        </FormRow>
      </Form>
    </DsSection>
  )
}

export { FormsConfig }
