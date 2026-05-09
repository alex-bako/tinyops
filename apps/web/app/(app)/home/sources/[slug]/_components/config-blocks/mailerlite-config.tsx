"use client"

import * as React from "react"
import { CopyIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { CheckCard } from "@workspace/ui/components/checkbox"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import { ChipPicker } from "../chip-picker"
import { DsSection, DsSectionHead } from "../ds-section"
import { KeyRow } from "../key-row"
import { SegmentedControl } from "../segmented-control"

const ALL_GROUPS = [
  { id: "newsletter", label: "Newsletter", meta: "2,341" },
  { id: "course-alums", label: "Course alums", meta: "318" },
  { id: "free-trial", label: "Free trial", meta: "492" },
  { id: "paid-monthly", label: "Paid · monthly", meta: "127" },
  { id: "paid-annual", label: "Paid · annual", meta: "61" },
  { id: "partners", label: "Partners & affiliates", meta: "24" },
]

const ALL_FIELDS = [
  { id: "company", label: "company" },
  { id: "signup_source", label: "signup_source" },
  { id: "plan_tier", label: "plan_tier" },
  { id: "country", label: "country" },
  { id: "lead_score", label: "lead_score" },
]

const ALL_TAGS = [
  { id: "bounced", label: "bounced" },
  { id: "unsubscribed", label: "unsubscribed" },
  { id: "internal-test", label: "internal-test" },
  { id: "complained", label: "complained" },
]

const ALL_WEBHOOKS = [
  { id: "sub.created", label: "subscriber.created" },
  { id: "sub.updated", label: "subscriber.updated" },
  { id: "sub.unsub", label: "subscriber.unsubscribed" },
  { id: "campaign.sent", label: "campaign.sent" },
  { id: "form.subscribed", label: "form.subscribed" },
]

function MailerLiteConfig() {
  const [scope, setScope] = React.useState("groups")

  return (
    <>
      <DsSection>
        <DsSectionHead
          title="What to import"
          hint="Choose which subscribers and activity end up on client timelines."
        />
        <Form>
          <FormRow
            label="Subscribers"
            help="Subscribers become or attach to clients in your workspace by email."
          >
            <SegmentedControl
              ariaLabel="Subscribers scope"
              value={scope}
              onChange={setScope}
              options={[
                { value: "all", label: "All subscribers" },
                { value: "groups", label: "Specific groups" },
                { value: "seg", label: "Saved segment" },
              ]}
            />
          </FormRow>

          {scope === "groups" ? (
            <FormRow
              label="Groups"
              help="2 of 6 selected · 2,659 subscribers"
            >
              <ChipPicker
                items={ALL_GROUPS}
                defaultValue={["newsletter", "course-alums"]}
                placeholder="Search groups…"
              />
            </FormRow>
          ) : null}

          {scope === "seg" ? (
            <FormRow label="Segment">
              <Select defaultValue="active-90">
                <SelectTrigger size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active-90">
                    Active in last 90 days · 1,204
                  </SelectItem>
                  <SelectItem value="high-engaged">
                    High engagement · 318
                  </SelectItem>
                </SelectContent>
              </Select>
            </FormRow>
          ) : null}

          <FormRow
            label="Activity"
            help="Each enabled item becomes events on the matching client's timeline."
          >
            <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
              <CheckCard
                label="Sent campaigns"
                description="Subject line, preview, opens & clicks"
                defaultChecked
              />
              <CheckCard
                label="Automation triggers"
                description="Welcome flows, drip steps, etc."
                defaultChecked
              />
              <CheckCard
                label="Form submissions"
                description="Embedded forms & landing pages"
                defaultChecked
              />
            </div>
          </FormRow>

          <FormRow
            label="Custom fields"
            help="Pulled onto each client as workspace properties."
          >
            <ChipPicker
              items={ALL_FIELDS}
              defaultValue={["company", "signup_source", "plan_tier"]}
              mono
              placeholder="Add a custom field…"
            />
          </FormRow>
        </Form>
      </DsSection>

      <DsSection>
        <DsSectionHead
          title="Filtering"
          hint="Keep noisy or sensitive activity out of timelines."
        />
        <Form>
          <FormRow
            label="Skip subscribers tagged"
            help="Comma-separated MailerLite tag names. Matched subscribers won't sync."
          >
            <ChipPicker
              items={ALL_TAGS}
              defaultValue={["bounced", "internal-test"]}
              mono
              placeholder="Add a tag…"
            />
          </FormRow>
          <FormRow
            label="Sensitive content"
            help="How aggressively to redact obvious PII (SSNs, card numbers) inside campaign bodies before they land on a timeline."
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

      <DsSection>
        <DsSectionHead
          title="Real-time webhook"
          hint="Optional — without this, MailerLite pulls every 15 minutes."
        />
        <Form>
          <FormRow
            label="Endpoint"
            help={
              <>
                In MailerLite, go to <code>Integrations → Webhooks</code> and
                paste this URL.
              </>
            }
          >
            <KeyRow value="https://hooks.tinyops.app/ml/wh_mWk2qY7c1Lf">
              <Button type="button" variant="ghost" size="sm">
                <CopyIcon />
                Copy
              </Button>
            </KeyRow>
          </FormRow>
          <FormRow label="Send events">
            <ChipPicker
              items={ALL_WEBHOOKS}
              defaultValue={["sub.created", "campaign.sent", "form.subscribed"]}
              mono
            />
          </FormRow>
        </Form>
      </DsSection>
    </>
  )
}

export { MailerLiteConfig }
