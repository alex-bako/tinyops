import { Form, FormRow } from "@workspace/ui/components/form-row"

import type { DataSource } from "@/lib/sources"

import { DsSection, DsSectionHead } from "../ds-section"
import { FileRow } from "../file-row"

const IMPORTED: Array<[string, string]> = [
  ["Subscribers", "linked to clients by email · status, groups and custom fields become client properties"],
  ["Orders", "from every connected e-commerce shop, as payment events"],
  ["Campaign engagement", "who opened or clicked each sent campaign; campaigns from the last 30 days are re-checked"],
]

function MailerLiteConfig({ source }: { source: DataSource }) {
  const mailerlite = source.kind === "data_source" ? source.mailerlite : undefined
  return (
    <DsSection>
      <DsSectionHead
        title="What is imported"
        hint="Polled every 30 minutes. Subscribers and orders are re-read in full on each run."
      />
      <Form>
        <FormRow label="Import from">
          <span className="font-mono text-[12.5px] text-foreground">
            {mailerlite?.syncFrom ? mailerlite.syncFrom.slice(0, 10) : "—"}
          </span>
        </FormRow>
        <FormRow label="Shops">
          <div className="flex flex-col gap-0.5">
            {(mailerlite?.shops ?? []).length > 0 ? (
              mailerlite?.shops.map((shop) => (
                <FileRow key={shop.id} name={shop.name} meta={shop.currency} />
              ))
            ) : (
              <span className="text-[12.5px] text-muted-foreground">
                No e-commerce shop connected in MailerLite
              </span>
            )}
          </div>
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

export { MailerLiteConfig }
