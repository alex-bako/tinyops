import { Kbd } from "@workspace/ui/components/kbd"
import { cn } from "@workspace/ui/lib/utils"

export function NotesEmpty() {
  return (
    <div
      className={cn(
        "rounded-sm border border-dashed border-[var(--rule-strong)] px-3.5 py-3 text-[13.5px] text-muted-foreground"
      )}
    >
      <span className="inline-flex items-center gap-1.5">
        Type <Kbd>/</Kbd> to add a note, link a source, or paste a file…
      </span>
    </div>
  )
}
