import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

const HANDLE_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'><circle cx='4' cy='3' r='1' fill='%23999'/><circle cx='4' cy='7' r='1' fill='%23999'/><circle cx='4' cy='11' r='1' fill='%23999'/><circle cx='10' cy='3' r='1' fill='%23999'/><circle cx='10' cy='7' r='1' fill='%23999'/><circle cx='10' cy='11' r='1' fill='%23999'/></svg>\")"

function NotionRow({
  className,
  children,
  asButton = true,
  ...props
}: React.ComponentProps<"div"> & { asButton?: boolean }) {
  return (
    <div
      data-slot="notion-row"
      role={asButton ? "button" : undefined}
      tabIndex={asButton ? 0 : undefined}
      className={cn(
        "group/row relative -mx-2 flex cursor-pointer items-center gap-2.5 rounded-sm py-1.5 pr-2 pl-7 transition-[background] duration-75",
        "hover:bg-[var(--tint-hover)]",
        className
      )}
      {...props}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1.5 top-1/2 size-3.5 -translate-y-1/2 bg-no-repeat opacity-0 transition-opacity duration-75 group-hover/row:opacity-60"
        style={{ backgroundImage: HANDLE_BG }}
      />
      {children}
    </div>
  )
}

export { NotionRow }
