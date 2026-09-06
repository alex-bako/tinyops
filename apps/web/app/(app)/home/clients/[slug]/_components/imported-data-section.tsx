import { Badge } from "@workspace/ui/components/badge"
import { Section, SectionHead } from "@workspace/ui/components/section"

import type { ClientAttribute } from "@/features/clients/application/client-memory"
import { formatImportedDate } from "@/features/clients/application/format-imported-date"

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

/** An array value is a set of names, not a sentence; chips beat a comma run. */
function AttributeValue({ value }: { value: unknown }) {
  if (!Array.isArray(value) || value.length === 0) {
    return (
      <>{typeof value === "string" ? formatImportedDate(value) : formatValue(value)}</>
    )
  }
  return (
    <span className="flex flex-wrap gap-1">
      {value.map((item, index) => (
        <Badge
          key={`${formatValue(item)}-${index}`}
          variant="tag"
          className="whitespace-normal"
        >
          {formatValue(item)}
        </Badge>
      ))}
    </span>
  )
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
            <dd className="min-w-0 break-words">
              <AttributeValue value={attribute.value} />
            </dd>
          </div>
        ))}
      </dl>
    </Section>
  )
}
