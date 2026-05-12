import * as React from "react"
import { FileTextIcon } from "lucide-react"

function FileRow({
  name,
  meta,
  children,
}: {
  name: React.ReactNode
  meta?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 rounded-sm bg-[var(--tint-hover)] px-2.5 py-2 text-[13px]">
      <FileTextIcon className="size-3.5 text-muted-foreground" />
      <span className="font-medium text-foreground">{name}</span>
      {meta ? (
        <span className="font-mono text-[11.5px] text-muted-foreground">
          {meta}
        </span>
      ) : null}
      {children ? <div className="ml-auto flex items-center">{children}</div> : null}
    </div>
  )
}

export { FileRow }
