import {
  ClipboardListIcon,
  FileTextIcon,
  MailIcon,
  type LucideIcon,
} from "lucide-react"

import type { DataSource } from "../_data"

const ICON_MAP: Record<DataSource["icon"], LucideIcon> = {
  mail: MailIcon,
  "file-text": FileTextIcon,
  "clipboard-list": ClipboardListIcon,
}

function SourceRow({ source }: { source: DataSource }) {
  const Icon = ICON_MAP[source.icon]
  return (
    <div className="flex items-center gap-2.5 border-b border-border py-2 text-[13.5px] last:border-b-0">
      <span className="inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground">
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col leading-[1.3]">
        <span className="text-[13.5px] text-foreground">{source.name}</span>
        <span className="font-mono text-[11px] text-muted-foreground">
          {source.sub}
        </span>
      </div>
      <span className="ml-auto inline-flex items-center gap-1.5 text-[12px] text-muted-foreground">
        {source.active && (
          <span
            aria-hidden
            className="inline-block size-1.5 rounded-full bg-mint-500"
          />
        )}
        {source.state}
      </span>
    </div>
  )
}

export { SourceRow }
