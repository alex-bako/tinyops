"use client"

import { CheckCard } from "@workspace/ui/components/checkbox"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { Switch } from "@workspace/ui/components/switch"

import { DsSection, DsSectionHead } from "../ds-section"
import { SegmentedControl } from "../segmented-control"

function StripeConfig() {
  return (
    <DsSection>
      <DsSectionHead
        title="What to import"
        hint="Stripe events become activity on the matching customer's timeline."
      />
      <Form>
        <FormRow label="Event types">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
            <CheckCard
              label="Successful payments"
              description="charge.succeeded"
              defaultChecked
            />
            <CheckCard
              label="Failed payments"
              description="charge.failed"
              defaultChecked
            />
            <CheckCard
              label="Refunds & disputes"
              description="charge.refunded · charge.dispute.*"
              defaultChecked
            />
            <CheckCard
              label="Subscription changes"
              description="customer.subscription.*"
              defaultChecked
            />
            <CheckCard label="Invoice events" description="invoice.payment_*" />
            <CheckCard
              label="Checkout sessions"
              description="checkout.session.*"
            />
          </div>
        </FormRow>
        <FormRow label="Customer matching">
          <SegmentedControl
            ariaLabel="Customer matching"
            defaultValue="email"
            options={[
              { value: "email", label: "By email" },
              { value: "meta", label: "By metadata.user_id" },
              { value: "both", label: "Email then metadata" },
            ]}
          />
        </FormRow>
        <FormRow
          label="Currency display"
          help="Original currency is always preserved in raw event data."
        >
          <Select defaultValue="origin">
            <SelectTrigger size="sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="origin">Original (USD, EUR, …)</SelectItem>
              <SelectItem value="usd">Convert to USD</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>
        <FormRow label="Test mode">
          <div className="inline-flex items-center gap-2 text-[13px] text-foreground">
            <Switch aria-label="Include events from test keys" />
            Include events from test keys
          </div>
        </FormRow>
      </Form>
    </DsSection>
  )
}

export { StripeConfig }
