import { Section, SectionHead } from "@workspace/ui/components/section"

import type { ClientAttribute } from "@/features/clients/application/client-memory"

/** Renders a jsonb attribute value; connectors store strings, numbers and arrays. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—"
  if (Array.isArray(value)) return value.map(formatValue).join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/** Turns `mailerlite_subscribed_at` into `Mailerlite subscribed at`. */
function formatKey(key: string): string {
  const words = key.replace(/[_-]+/g, " ").trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

/**
 * Connector-ingested facts (`client_attributes`), read-only. Separate from
 * Properties, which is the user-authored `client_properties` table — imported
 * clients used to show an empty profile even with hundreds of ingested facts.
 */
export function ImportedDataSection({
  attributes,
}: {
  attributes: ClientAttribute[]
}) {
  if (attributes.length === 0) return null

  return (
    <Section divider>
      <SectionHead
        title="Imported data"
        count={`${attributes.length} ${attributes.length === 1 ? "field" : "fields"}`}
      />
      <dl className="-mx-1.5 flex flex-col">
        {attributes.map((attribute) => (
          <div
            key={attribute.key}
            className="flex gap-3 px-1.5 py-[5px] text-[13px]"
          >
            <dt
              className="w-44 shrink-0 truncate text-muted-foreground"
              title={attribute.sourceName ?? undefined}
            >
              {formatKey(attribute.key)}
            </dt>
            <dd className="min-w-0 break-words">{formatValue(attribute.value)}</dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
