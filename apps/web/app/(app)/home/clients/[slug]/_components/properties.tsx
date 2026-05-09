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

import { RecordRow } from "@workspace/ui/components/record-row"
import { Badge, BadgeDot } from "@workspace/ui/components/badge"
import { EditorialItalic } from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

import type {
  ClientProperty,
  ClientPropertyValue,
  PropertyIcon,
} from "@/lib/clients"

const ICONS: Record<PropertyIcon, LucideIcon> = {
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

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "mr-1 inline-block rounded-xs bg-[var(--tint-active)] px-[7px] py-[1px] text-[12px] text-slate-700"
      )}
    >
      {children}
    </span>
  )
}

function PropertyValue({ value }: { value: ClientPropertyValue }) {
  if (value.kind === "text")
    return (
      <span className="text-[13.5px] leading-[1.55] text-foreground">
        {value.value}
      </span>
    )
  if (value.kind === "italic")
    return (
      <EditorialItalic className="text-[14px] text-foreground">
        &ldquo;{value.value}&rdquo;
      </EditorialItalic>
    )
  if (value.kind === "tags")
    return (
      <span className="flex flex-wrap items-center gap-1">
        {value.values.map((v) => (
          <Tag key={v}>{v}</Tag>
        ))}
      </span>
    )
  if (value.kind === "tag-and-text")
    return (
      <span className="text-[13.5px] leading-[1.55] text-foreground">
        <Tag>{value.tag}</Tag>
        <span className="text-muted-foreground">{value.text}</span>
      </span>
    )
  // badge
  return (
    <Badge variant={value.variant}>
      {value.dot ? <BadgeDot /> : null}
      {value.label}
    </Badge>
  )
}

export function Properties({
  properties,
}: {
  properties: ClientProperty[]
}) {
  return (
    <div className="-mx-1.5 flex flex-col">
      {properties.map((p) => {
        const Icon = ICONS[p.icon]
        return (
          <RecordRow
            key={p.key}
            variant="property"
            interactive={false}
            className={cn(
              "transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-[var(--tint-hover)]"
            )}
          >
            <span
              className={cn(
                "inline-flex h-[22px] items-center gap-1.5 whitespace-nowrap text-[13.5px] text-muted-foreground"
              )}
            >
              <Icon className="size-[14px] opacity-70" />
              {p.key}
            </span>
            <span
              className={cn(
                "py-0.5 text-[13.5px] leading-[1.55]",
                p.avoid &&
                  "-mx-2 -my-0.5 rounded-sm bg-coral-500/10 px-2.5 py-1.5 text-coral-700"
              )}
            >
              <PropertyValue value={p.value} />
            </span>
          </RecordRow>
        )
      })}
    </div>
  )
}
