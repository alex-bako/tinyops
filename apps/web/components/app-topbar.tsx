"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  BellIcon,
  HelpCircleIcon,
  HomeIcon,
  MoreHorizontalIcon,
  UsersIcon,
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

const HOME: Crumb = { icon: HomeIcon, label: "Home", href: "/home" }

const ROUTE_CRUMBS: Record<string, Crumb[]> = {
  "/home": [{ icon: HomeIcon, label: "Home" }],
  "/home/clients": [HOME, { icon: UsersIcon, label: "Clients" }],
}

function deriveCrumbs(pathname: string): Crumb[] {
  if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname]!
  const match = Object.keys(ROUTE_CRUMBS)
    .filter((p) => pathname.startsWith(`${p}/`))
    .sort((a, b) => b.length - a.length)[0]
  if (match) return ROUTE_CRUMBS[match]!
  return [{ icon: HomeIcon, label: "Home" }]
}

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

export function AppTopbar({ crumbs }: { crumbs?: Crumb[] }) {
  const pathname = usePathname() ?? "/home"
  const resolved = crumbs ?? deriveCrumbs(pathname)

  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex h-11 shrink-0 items-center gap-1 border-b border-border bg-background px-4"
      )}
    >
      <SidebarTrigger className="-ml-1 size-7 md:hidden" />

      <Breadcrumb>
        <BreadcrumbList>
          {resolved.map((crumb, index) => {
            const isLast = index === resolved.length - 1
            return (
              <React.Fragment key={`${crumb.label}-${index}`}>
                <BreadcrumbItem>
                  {isLast || !crumb.href ? (
                    <BreadcrumbPage>
                      <CrumbContent {...crumb} />
                    </BreadcrumbPage>
                  ) : (
                    <BreadcrumbLink asChild>
                      <Link href={crumb.href}>
                        <CrumbContent {...crumb} />
                      </Link>
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
