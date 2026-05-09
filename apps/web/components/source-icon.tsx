import {
  CalendarIcon,
  ClipboardListIcon,
  CreditCardIcon,
  FileTextIcon,
  GraduationCapIcon,
  MailIcon,
  type LucideIcon,
} from "lucide-react"

import type { DataSourceIcon } from "@/lib/sources"

const SOURCE_ICON_MAP: Record<DataSourceIcon, LucideIcon> = {
  mail: MailIcon,
  "file-text": FileTextIcon,
  "clipboard-list": ClipboardListIcon,
  "credit-card": CreditCardIcon,
  calendar: CalendarIcon,
  "graduation-cap": GraduationCapIcon,
}

function SourceIcon({
  icon,
  className,
}: {
  icon: DataSourceIcon
  className?: string
}) {
  const Icon = SOURCE_ICON_MAP[icon]
  return <Icon className={className} />
}

export { SourceIcon }
