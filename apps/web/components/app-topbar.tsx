import * as React from "react"
import {
  BellIcon,
  HelpCircleIcon,
  HomeIcon,
  MoreHorizontalIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"

export type Crumb = {
  icon?: LucideIcon
  label: string
  href?: string
}

const DEFAULT_CRUMBS: Crumb[] = [{ icon: HomeIcon, label: "Home" }]

function CrumbContent({ icon: Icon, label }: Crumb) {
  return (
    <>
      {Icon ? <Icon /> : null}
      <span>{label}</span>
    </>
  )
}

function TopbarIconButton({
  ariaLabel,
  count,
  children,
}: {
  ariaLabel: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={cn(
        "relative inline-flex size-8 items-center justify-center rounded-sm text-muted-foreground",
        "transition-colors duration-(--dur-fast) ease-(--ease-out)",
        "hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring",
        "[&>svg]:size-4"
      )}
    >
      {children}
      {count != null ? (
        <span
          aria-hidden
          className="absolute top-0.5 right-0.5 inline-flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-primary px-[3px] font-mono text-[10px] leading-none font-semibold text-primary-foreground ring-2 ring-background"
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}

export function AppTopbar({ crumbs = DEFAULT_CRUMBS }: { crumbs?: Crumb[] }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-4"
      )}
    >
      <SidebarTrigger className="-ml-1 size-7 md:hidden" />

      <Breadcrumb>
        <BreadcrumbList>
          {crumbs.map((crumb, index) => {
            const isLast = index === crumbs.length - 1
            return (
              <React.Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem>
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage>
                      <CrumbContent {...crumb} />
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink href={crumb.href}>
                      <CrumbContent {...crumb} />
                    </BreadcrumbLink>
                  )}
                </BreadcrumbItem>
                {!isLast ? <BreadcrumbSeparator /> : null}
              </React.Fragment>
            )
          })}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex-1" />

      <div className="flex items-center gap-1">
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-sm px-2 py-1 text-[12px] text-muted-foreground",
            "transition-colors duration-(--dur-fast) ease-(--ease-out) hover:bg-muted hover:text-foreground"
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-mint-500" />
          <span>
            Mailbox <span className="text-muted-foreground/70">· 2m ago</span>
          </span>
        </button>

        <TopbarIconButton ariaLabel="Notifications · 3 unread" count={3}>
          <BellIcon />
        </TopbarIconButton>

        <TopbarIconButton ariaLabel="Help">
          <HelpCircleIcon />
        </TopbarIconButton>

        <TopbarIconButton ariaLabel="More">
          <MoreHorizontalIcon />
        </TopbarIconButton>
      </div>
    </header>
  )
}
