import { Badge } from "@workspace/ui/components/badge"

import type { AttentionItem } from "../_data"

function StatRow({ item }: { item: AttentionItem }) {
  return (
    <div className="flex items-baseline gap-3.5 border-b border-border py-2.5 last:border-b-0">
      <span className="min-w-[38px] text-[26px] font-semibold leading-none tracking-[-0.04em] tabular-nums text-foreground">
        {item.num}
      </span>
      <span className="flex-1 text-[13.5px] text-foreground">{item.label}</span>
      <Badge variant={item.badge.kind} className="self-center">
        {item.badge.text}
      </Badge>
    </div>
  )
}

export { StatRow }
