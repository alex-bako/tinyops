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
import { Button, ButtonIndicator } from "@workspace/ui/components/button"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@workspace/ui/components/breadcrumb"
import { SidebarTrigger } from "@workspace/ui/components/sidebar"

import { clientBySlug } from "@/lib/clients"

export type Crumb = {
  icon?: LucideIcon
  label: string
  href?: string
}

const HOME: Crumb = { icon: HomeIcon, label: "Home", href: "/home" }
const CLIENTS: Crumb = {
  icon: UsersIcon,
  label: "Clients",
  href: "/home/clients",
}

const ROUTE_CRUMBS: Record<string, Crumb[]> = {
  "/home": [{ icon: HomeIcon, label: "Home" }],
  "/home/clients": [HOME, { icon: UsersIcon, label: "Clients" }],
}

function deriveCrumbs(pathname: string): Crumb[] {
  if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname]!

  const clientSlug = pathname.match(/^\/home\/clients\/([^/]+)\/?$/)?.[1]
  if (clientSlug) {
    const client = clientBySlug(clientSlug)
    return [HOME, CLIENTS, { label: client?.name ?? clientSlug }]
  }

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
        <Button
          type="button"
          variant="tertiary"
          className={cn(
            "h-auto gap-1.5 px-2 py-1 text-[12px] font-normal text-muted-foreground",
            "hover:bg-muted hover:text-foreground"
          )}
        >
          <span aria-hidden className="size-1.5 rounded-full bg-mint-500" />
          <span>
            Mailbox <span className="text-muted-foreground/70">· 2m ago</span>
          </span>
        </Button>

        <Button
          type="button"
          variant="tertiary"
          size="icon"
          aria-label="Notifications · 3 unread"
          className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-4"
        >
          <BellIcon />
          <ButtonIndicator>3</ButtonIndicator>
        </Button>

        <Button
          type="button"
          variant="tertiary"
          size="icon"
          aria-label="Help"
          className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-4"
        >
          <HelpCircleIcon />
        </Button>

        <Button
          type="button"
          variant="tertiary"
          size="icon"
          aria-label="More"
          className="size-8 text-muted-foreground hover:bg-muted hover:text-foreground [&>svg]:size-4"
        >
          <MoreHorizontalIcon />
        </Button>
      </div>
    </header>
  )
}
