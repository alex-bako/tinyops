import {
  ActivityIcon,
  AlignLeftIcon,
  CalendarIcon,
  CircleDotIcon,
  ClockIcon,
  FileTextIcon,
  FlagIcon,
  HashIcon,
  LinkIcon,
  MailIcon,
  MapPinIcon,
  PlugIcon,
  SendIcon,
  ShieldAlertIcon,
  ShieldCheckIcon,
  StarIcon,
  TagIcon,
  TargetIcon,
  WandSparklesIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type {
  PropertyIcon,
  PropertyType,
} from "@/features/clients/application/client-memory"

const PROPERTY_ICONS: Record<PropertyIcon, LucideIcon> = {
  "align-left": AlignLeftIcon,
  "circle-dot": CircleDotIcon,
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
  "map-pin": MapPinIcon,
  tag: TagIcon,
  star: StarIcon,
  flag: FlagIcon,
  clock: ClockIcon,
  link: LinkIcon,
  "file-text": FileTextIcon,
}

/** Icons offered in the picker — every icon except the implicit text default. */
export const PROPERTY_ICON_CHOICES: PropertyIcon[] = [
  "circle-dot", "hash", "calendar", "send", "plug", "target", "activity",
  "wand", "shield-check", "shield-alert", "mail", "map-pin", "tag", "star",
  "flag", "clock", "link", "file-text",
]

/** Label + default glyph for each property type, used by the type selector. */
export const PROPERTY_TYPE_META: Record<
  PropertyType,
  { label: string; icon: PropertyIcon }
> = {
  text: { label: "Text", icon: "align-left" },
  tags: { label: "Tags", icon: "hash" },
  date: { label: "Date", icon: "calendar" },
  status: { label: "Status", icon: "circle-dot" },
}

export const PROPERTY_TYPE_ORDER: PropertyType[] = ["text", "tags", "date", "status"]

export function PropertyIconView({
  icon,
  className,
}: {
  icon: PropertyIcon
  className?: string
}) {
  const Icon = PROPERTY_ICONS[icon] ?? CircleDotIcon
  return <Icon className={cn("size-[14px]", className)} />
}
