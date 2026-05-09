import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

const HANDLE_BG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'><circle cx='4' cy='3' r='1' fill='%23999'/><circle cx='4' cy='7' r='1' fill='%23999'/><circle cx='4' cy='11' r='1' fill='%23999'/><circle cx='10' cy='3' r='1' fill='%23999'/><circle cx='10' cy='7' r='1' fill='%23999'/><circle cx='10' cy='11' r='1' fill='%23999'/></svg>\")"

type RecordRowVariant = "list" | "property" | "source"

const rowClasses: Record<RecordRowVariant, string> = {
  list: "-mx-2 flex items-center gap-2.5 py-1.5 pr-2 pl-7",
  property:
    "grid min-h-[30px] grid-cols-[160px_1fr] items-start gap-x-3 px-1.5 py-[5px]",
  source: "flex items-center gap-2.5 border-b border-border py-2 text-[13.5px] last:border-b-0",
}

function RecordRowHandle() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-1.5 top-1/2 size-3.5 -translate-y-1/2 bg-no-repeat opacity-0 transition-opacity duration-75 group-hover/record-row:opacity-60"
      style={{ backgroundImage: HANDLE_BG }}
    />
  )
}

function RecordRow({
  className,
  children,
  variant = "list",
  interactive = variant === "list",
  showHandle = variant === "list",
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & {
  variant?: RecordRowVariant
  interactive?: boolean
  showHandle?: boolean
  asChild?: boolean
}) {
  const classes = cn(
    "group/record-row relative rounded-sm transition-[background] duration-75 text-inherit",
    rowClasses[variant],
    interactive && "cursor-pointer hover:bg-[var(--tint-hover)] no-underline",
    className
  )
  const content = (
    <>
      {showHandle ? <RecordRowHandle /> : null}
      {children}
    </>
  )

  if (asChild) {
    const child = React.Children.only(children) as React.ReactElement<
      Record<string, unknown>
    >
    const childClassName = (child.props as { className?: string }).className
    const childChildren = (child.props as { children?: React.ReactNode }).children
    return React.cloneElement(
      child,
      {
        ...props,
        "data-slot": "record-row",
        className: cn(classes, childClassName),
      },
      <>
        {showHandle ? <RecordRowHandle /> : null}
        {childChildren}
      </>
    )
  }

  return (
    <div
      data-slot="record-row"
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={classes}
      {...props}
    >
      {content}
    </div>
  )
}

export { RecordRow }
export type { RecordRowVariant }
