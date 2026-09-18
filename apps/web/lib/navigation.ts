import { HomeIcon, PlugZapIcon, Settings2Icon } from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  DEFAULT_SIGNED_IN_PATH,
  SETTINGS_PATH,
  SOURCES_PATH,
} from "@/lib/auth/route-policy"

export type NavItem = {
  id: string
  label: string
  icon: LucideIcon
  count?: number
  href?: string
}

export type NavGroup = {
  id: "primary" | "workspace"
  label?: string
  items: NavItem[]
}

export type Crumb = {
  icon?: LucideIcon
  label: string
  href?: string
}

export type AppRouteId = "home" | "sources" | "settings"

export type AppRoute = {
  id: AppRouteId
  label: string
  icon: LucideIcon
  href: string
  count?: number
  parentId?: AppRouteId
  navGroup?: "primary"
}

const APP_ROUTES: AppRoute[] = [
  {
    id: "home",
    label: "Home",
    icon: HomeIcon,
    href: DEFAULT_SIGNED_IN_PATH,
    navGroup: "primary",
  },
  {
    id: "sources",
    label: "Data sources",
    icon: PlugZapIcon,
    href: SOURCES_PATH,
    parentId: "home",
    navGroup: "primary",
  },
  {
    id: "settings",
    label: "Workspace settings",
    icon: Settings2Icon,
    href: SETTINGS_PATH,
    parentId: "home",
  },
]

function appRoute(id: AppRouteId): AppRoute {
  const route = APP_ROUTES.find((candidate) => candidate.id === id)
  if (!route) throw new Error(`Unknown app route: ${id}`)
  return route
}

function routeCrumb(route: AppRoute, href?: string): Crumb {
  return { icon: route.icon, label: route.label, href }
}

const HOME_ROUTE = appRoute("home")
const SOURCES_ROUTE = appRoute("sources")

const HOME: Crumb = routeCrumb(HOME_ROUTE, HOME_ROUTE.href)
const SOURCES: Crumb = routeCrumb(SOURCES_ROUTE, SOURCES_ROUTE.href)

function routeCrumbs(route: AppRoute): Crumb[] {
  if (!route.parentId) return [routeCrumb(route)]
  return [HOME, routeCrumb(route)]
}

const ROUTE_CRUMBS: Record<string, Crumb[]> = Object.fromEntries(
  APP_ROUTES.map((route) => [route.href, routeCrumbs(route)])
)

function flattenNavItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items)
}

function pickActiveNavItemId(
  items: NavItem[],
  pathname: string
): string | null {
  let bestId: string | null = null
  let bestLen = -1
  for (const item of items) {
    if (!item.href) continue
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`)
    if (matches && item.href.length > bestLen) {
      bestId = item.id
      bestLen = item.href.length
    }
  }
  return bestId
}

function deriveAppCrumbs(
  pathname: string,
  options: {
    resolveClientName?: (slug: string) => string | undefined
    resolveSourceTitle?: (identity: {
      sourceType: string
      sourceSlug: string
    }) => string | undefined
  } = {}
): Crumb[] {
  if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname]!

  const clientSlug = pathname.match(/^\/home\/clients\/([^/]+)\/?$/)?.[1]
  if (clientSlug) {
    // Home is the client list, so there is no "Clients" crumb between them.
    return [HOME, { label: options.resolveClientName?.(clientSlug) ?? clientSlug }]
  }

  const sourceMatch = pathname.match(
    /^\/home\/sources\/([^/]+)\/([^/]+)\/?$/
  )
  if (sourceMatch) {
    const sourceType = sourceMatch[1]!
    const sourceSlug = sourceMatch[2]!
    return [
      HOME,
      SOURCES,
      {
        label:
          options.resolveSourceTitle?.({ sourceType, sourceSlug }) ??
          sourceSlug,
      },
    ]
  }

  const match = Object.keys(ROUTE_CRUMBS).reduce<string | null>(
    (best, route) => {
      if (!pathname.startsWith(`${route}/`)) return best
      return !best || route.length > best.length ? route : best
    },
    null
  )
  if (match) return ROUTE_CRUMBS[match]!
  return [{ icon: HomeIcon, label: "Home" }]
}

export {
  APP_ROUTES,
  HOME,
  SOURCES,
  deriveAppCrumbs,
  flattenNavItems,
  pickActiveNavItemId,
}
