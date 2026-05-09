import {
  MessageSquareIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { RecordRow } from "@workspace/ui/components/record-row"
import { cn } from "@workspace/ui/lib/utils"

import type { WeekTask } from "../_data"

const ICON_MAP: Record<WeekTask["icon"], LucideIcon> = {
  sparkles: SparklesIcon,
  "message-square": MessageSquareIcon,
}

const TONE_BG: Record<WeekTask["tone"], string> = {
  cobalt: "bg-cobalt-500 text-white",
  mint: "bg-mint-500 text-white",
}

function WeekTaskRow({ task }: { task: WeekTask }) {
  const Icon = ICON_MAP[task.icon]
  return (
    <RecordRow interactive={false}>
      <span
        aria-hidden
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-sm",
          TONE_BG[task.tone]
        )}
      >
        <Icon className="size-3.5" />
      </span>
      <div className="flex min-w-0 flex-col leading-[1.25]">
        <span className="text-[14px] text-foreground">{task.title}</span>
        <span className="font-mono text-[11.5px] text-muted-foreground">
          {task.sub}
        </span>
      </div>
      <span className="ml-auto flex items-center">
        <Badge variant={task.badge.kind}>{task.badge.text}</Badge>
      </span>
    </RecordRow>
  )
}

export { WeekTaskRow }
