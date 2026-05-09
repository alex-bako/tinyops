"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Textarea } from "@workspace/ui/components/textarea"

import { ChipPicker } from "../chip-picker"
import { DsSection, DsSectionHead } from "../ds-section"
import { RuleRow } from "../rule-row"
import { SegmentedControl } from "../segmented-control"

const FOLDERS = [
  { id: "INBOX", label: "INBOX", meta: "1,204" },
  { id: "Clients", label: "Clients", meta: "412" },
  { id: "Sent", label: "Sent", meta: "832" },
  { id: "Archive", label: "Archive", meta: "5,210" },
  { id: "Spam", label: "Spam", meta: "39" },
]

function ImapConfig() {
  return (
    <DsSection>
      <DsSectionHead
        title="Folders & filters"
        hint="Only messages matching these rules are imported."
      />
      <Form>
        <FormRow label="Folders to watch">
          <ChipPicker
            items={FOLDERS}
            defaultValue={["INBOX", "Clients", "Sent"]}
            mono
          />
        </FormRow>
        <FormRow label="History window">
          <SegmentedControl
            ariaLabel="History window"
            defaultValue="12mo"
            options={[
              { value: "3mo", label: "3 months" },
              { value: "12mo", label: "12 months" },
              { value: "all", label: "All" },
            ]}
          />
        </FormRow>
        <FormRow
          label="Skip senders matching"
          help="One pattern per line. Supports wildcards like *@noreply.com"
        >
          <Textarea
            rows={3}
            defaultValue={
              "*@noreply.*\nsupport@stripe.com\ncalendar-notification@google.com"
            }
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow label="Only messages where">
          <div className="flex flex-col gap-1.5">
            <RuleRow field="To" op="is" value="hello@yourpractice.com" />
            <RuleRow field="Subject" op="does not contain" value="invoice" />
            <button
              type="button"
              className="inline-flex items-center gap-1 self-start rounded-[3px] px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
            >
              <PlusIcon className="size-3" />
              Add rule
            </button>
          </div>
        </FormRow>
        <FormRow
          label="Sensitive content"
          help="Redact medical, financial, and government-ID-shaped content before storing."
        >
          <SegmentedControl
            ariaLabel="Sensitive content"
            defaultValue="standard"
            options={[
              { value: "off", label: "Off" },
              { value: "standard", label: "Standard" },
              { value: "strict", label: "Strict" },
            ]}
          />
        </FormRow>
      </Form>
    </DsSection>
  )
}

export { ImapConfig }
