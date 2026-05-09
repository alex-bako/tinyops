import { cn } from "@workspace/ui/lib/utils"

import { SourceIcon } from "@/components/source-icon"
import type { DataSourceIcon } from "@/lib/sources"

function SourceLogo({
  icon,
  className,
}: {
  icon: DataSourceIcon
  className?: string
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-14 items-center justify-center rounded-md",
        className ?? "bg-[var(--tint-hover)] text-foreground"
      )}
    >
      <SourceIcon icon={icon} className="size-6" />
    </span>
  )
}

export { SourceLogo }
