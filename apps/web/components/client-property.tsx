import {
  ActivityIcon,
  CalendarIcon,
  CircleDotDashedIcon,
  HashIcon,
  MailIcon,
  MapPinIcon,
  PlugIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  TargetIcon,
  UserIcon,
  WandSparklesIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { Badge, BadgeDot } from "@workspace/ui/components/badge"
import { RecordRow } from "@workspace/ui/components/record-row"
import { EditorialItalic } from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

import type {
  ClientProperty,
  ClientPropertyValue,
  PropertyIcon,
} from "@/features/clients/application/client-memory"

const PROPERTY_ICONS: Record<PropertyIcon, LucideIcon> = {
  "circle-dot": CircleDotDashedIcon,
  hash: HashIcon,
  calendar: CalendarIcon,
  send: SendIcon,
  plug: PlugIcon,
  target: TargetIcon,
  activity: ActivityIcon,
  wand: WandSparklesIcon,
  "shield-check": ShieldCheckIcon,
  "shield-alert": ShieldAlertIcon,
  mail: MailIcon,
  user: UserIcon,
  "map-pin": MapPinIcon,
}

function ClientPropertyTag({ children }: { children: React.ReactNode }) {
  return (
    <span className="mr-1 inline-block rounded-xs bg-[var(--tint-active)] px-[7px] py-[1px] text-[12px] text-foreground">
      {children}
    </span>
  )
}

function ClientPropertyValueView({ value }: { value: ClientPropertyValue }) {
  if (value.kind === "text") {
    return (
      <span className="text-[13.5px] leading-[1.55] text-foreground">
        {value.value}
      </span>
    )
  }

  if (value.kind === "italic") {
    return (
      <EditorialItalic className="text-[14px] text-foreground">
        &ldquo;{value.value}&rdquo;
      </EditorialItalic>
    )
  }

  if (value.kind === "tags") {
    return (
      <span className="flex flex-wrap items-center gap-1">
        {value.values.map((tag) => (
          <ClientPropertyTag key={tag}>{tag}</ClientPropertyTag>
        ))}
      </span>
    )
  }

  if (value.kind === "tag-and-text") {
    return (
      <span className="text-[13.5px] leading-[1.55] text-foreground">
        <ClientPropertyTag>{value.tag}</ClientPropertyTag>
        <span className="text-muted-foreground">{value.text}</span>
      </span>
    )
  }

  return (
    <Badge variant={value.variant}>
      {value.dot ? <BadgeDot /> : null}
      {value.label}
    </Badge>
  )
}

function ClientPropertyRow({ property }: { property: ClientProperty }) {
  const Icon = PROPERTY_ICONS[property.icon]

  return (
    <RecordRow
      variant="property"
      interactive={false}
      className="transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-[var(--tint-hover)]"
    >
      <span className="inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap text-[13.5px] text-muted-foreground">
        <Icon className="size-[14px] opacity-70" />
        {property.key}
      </span>
      <span
        className={cn(
          "py-0.5 text-[13.5px] leading-[1.55]",
          property.avoid &&
            "-mx-2 -my-0.5 rounded-sm bg-coral-500/10 px-2.5 py-1.5 text-coral-700"
        )}
      >
        <ClientPropertyValueView value={property.value} />
      </span>
    </RecordRow>
  )
}

function ClientPropertyList({ properties }: { properties: ClientProperty[] }) {
  return (
    <div className="-mx-1.5 flex flex-col">
      {properties.map((property) => (
        <ClientPropertyRow key={property.key} property={property} />
      ))}
    </div>
  )
}

export { ClientPropertyList, ClientPropertyRow, ClientPropertyValueView }
