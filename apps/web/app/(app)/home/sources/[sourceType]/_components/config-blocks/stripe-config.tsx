import { Form, FormRow } from "@workspace/ui/components/form-row"

import type { DataSource } from "@/lib/sources"

import { DsSection, DsSectionHead } from "../ds-section"
import { FileRow } from "../file-row"

const IMPORTED: Array<[string, string]> = [
  ["Customers", "linked to clients by email · Stripe customer id kept as an identity"],
  ["Payments", "charges, including failed and refunded ones"],
  ["Refunds & disputes", "each as its own timeline entry"],
  ["Invoices & subscriptions", "paid, voided, started, cancelled"],
]

function StripeConfig({ source }: { source: DataSource }) {
  const stripe = source.kind === "data_source" ? source.stripe : undefined
  return (
    <DsSection>
      <DsSectionHead
        title="What is imported"
        hint="Stripe activity becomes payment events on the matching client's timeline. Polled every 30 minutes; status changes are picked up from Stripe events."
      />
      <Form>
        <FormRow label="Import from">
          <span className="font-mono text-[12.5px] text-foreground">
            {stripe?.syncFrom ? stripe.syncFrom.slice(0, 10) : "—"}
          </span>
        </FormRow>
        <FormRow label="Objects">
          <div className="flex flex-col gap-0.5">
            {IMPORTED.map(([name, meta]) => (
              <FileRow key={name} name={name} meta={meta} />
            ))}
          </div>
        </FormRow>
      </Form>
    </DsSection>
  )
}

export { StripeConfig }
