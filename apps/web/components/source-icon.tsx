import Image from "next/image"
import { FileTextIcon, MailIcon, PlugIcon, type LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import type { DataSourceIcon } from "@/features/data-sources/connector-metadata"

const SOURCE_ICON_MAP: Record<DataSourceIcon, LucideIcon | string> = {
  mail: MailIcon,
  "file-text": FileTextIcon,
  forms: "/source-icons/forms.svg",
  stripe: "/source-icons/stripe.svg",
  calendly: "/source-icons/calendly.svg",
  teachable: "/source-icons/teachable.png",
  mailerlite: "/source-icons/mailerlite.svg",
  plug: PlugIcon,
}

function SourceIcon({
  icon,
  className,
}: {
  icon: DataSourceIcon
  className?: string
}) {
  const Icon = SOURCE_ICON_MAP[icon] ?? PlugIcon
  if (typeof Icon === "string") {
    return (
      <Image
        src={Icon}
        alt=""
        aria-hidden
        width={24}
        height={24}
        unoptimized
        className={cn("shrink-0 object-contain", className)}
      />
    )
  }
  return <Icon aria-hidden className={cn("shrink-0", className)} />
}

export { SourceIcon }
