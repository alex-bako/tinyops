import * as React from "react"
import type { LucideIcon } from "lucide-react"

import {
  Body,
  Eyebrow,
  H1,
} from "@workspace/ui/components/typography"
import { cn } from "@workspace/ui/lib/utils"

type WorkspacePageSurfaceWidth = "default" | "narrow"

const surfaceWidth: Record<WorkspacePageSurfaceWidth, string> = {
  default: "max-w-[1200px]",
  narrow: "max-w-[640px]",
}

function WorkspacePageSurface({
  className,
  width = "default",
  ...props
}: React.ComponentProps<"div"> & { width?: WorkspacePageSurfaceWidth }) {
  return React.createElement("div", {
    "data-slot": "workspace-page-surface",
    className: cn(
      "mx-auto w-full px-6 pt-10 pb-24 md:px-14 md:pt-14",
      surfaceWidth[width],
      className
    ),
    ...props,
  })
}

function WorkspacePageHeader({
  className,
  titleClassName,
  descriptionClassName,
  eyebrow,
  eyebrowIcon: Icon,
  title,
  description,
}: {
  className?: string
  titleClassName?: string
  descriptionClassName?: string
  eyebrow: React.ReactNode
  eyebrowIcon?: LucideIcon
  title: React.ReactNode
  description?: React.ReactNode
}) {
  return React.createElement(
    "div",
    { "data-slot": "workspace-page-header", className },
    React.createElement(
      Eyebrow,
      { className: "inline-flex items-center gap-1.5 [&>svg]:size-3.5" },
      Icon ? React.createElement(Icon) : null,
      React.createElement("span", null, eyebrow)
    ),
    React.createElement(
      H1,
      {
        className: cn(
          "mt-3 text-[38px] font-bold leading-[1.15] tracking-[-0.025em]",
          titleClassName
        ),
      },
      title
    ),
    description
      ? React.createElement(
          Body,
          {
            size: "lg",
            className: cn(
              "mt-2.5 max-w-[640px] text-[15px] leading-[1.55] text-muted-foreground",
              descriptionClassName
            ),
          },
          description
        )
      : null
  )
}

function WorkspacePageFooter({
  className,
  ...props
}: React.ComponentProps<"footer">) {
  return React.createElement("footer", {
    "data-slot": "workspace-page-footer",
    className: cn(
      "flex flex-wrap items-center gap-2 px-0.5 pt-3.5 font-mono text-[12px] text-muted-foreground",
      className
    ),
    ...props,
  })
}

export { WorkspacePageFooter, WorkspacePageHeader, WorkspacePageSurface }
export type { WorkspacePageSurfaceWidth }
