import {
  CircleSlashIcon,
  HashIcon,
  HomeIcon,
  ListTodoIcon,
  MessageSquareIcon,
  PlugZapIcon,
  Settings2Icon,
  UsersIcon,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import {
  CLIENTS_PATH,
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
  id: "primary" | "pinned" | "workspace"
  label?: string
  items: NavItem[]
}

export type Crumb = {
  icon?: LucideIcon
  label: string
  href?: string
}

export type AppRouteId = "home" | "clients" | "sources" | "settings"

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
    id: "clients",
    label: "Clients",
    icon: UsersIcon,
    count: 142,
    href: CLIENTS_PATH,
    parentId: "home",
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
const CLIENTS_ROUTE = appRoute("clients")
const SOURCES_ROUTE = appRoute("sources")
const SETTINGS_ROUTE = appRoute("settings")

const HOME: Crumb = routeCrumb(HOME_ROUTE, HOME_ROUTE.href)
const CLIENTS: Crumb = routeCrumb(CLIENTS_ROUTE, CLIENTS_ROUTE.href)
const SOURCES: Crumb = routeCrumb(SOURCES_ROUTE, SOURCES_ROUTE.href)

function routeCrumbs(route: AppRoute): Crumb[] {
  if (!route.parentId) return [routeCrumb(route)]
  return [HOME, routeCrumb(route)]
}

const ROUTE_CRUMBS: Record<string, Crumb[]> = Object.fromEntries(
  APP_ROUTES.map((route) => [route.href, routeCrumbs(route)])
)

function navItemForRoute(id: AppRouteId): NavItem {
  const route = appRoute(id)
  return {
    id: route.id,
    label: route.label,
    icon: route.icon,
    count: route.count,
    href: route.href,
  }
}

const NAV_GROUPS: NavGroup[] = [
  {
    id: "primary",
    items: [
      navItemForRoute("home"),
      navItemForRoute("clients"),
      { id: "tasks", label: "Tasks", icon: ListTodoIcon, count: 3 },
      navItemForRoute("sources"),
    ],
  },
  {
    id: "pinned",
    label: "Pinned views",
    items: [
      { id: "march", label: "March cohort", icon: HashIcon, count: 47 },
      {
        id: "feedback",
        label: "Feedback queue",
        icon: MessageSquareIcon,
        count: 12,
      },
      { id: "dnc", label: "Do not contact", icon: CircleSlashIcon, count: 3 },
    ],
  },
  {
    id: "workspace",
    label: "Workspace",
    items: [
      {
        id: "settings",
        label: "Settings",
        icon: Settings2Icon,
        href: SETTINGS_ROUTE.href,
      },
    ],
  },
]

function flattenNavItems(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((group) => group.items)
}

function pickActiveNavItemId(items: NavItem[], pathname: string): string | null {
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
    resolveSourceTitle?: (slug: string) => string | undefined
  } = {}
): Crumb[] {
  if (ROUTE_CRUMBS[pathname]) return ROUTE_CRUMBS[pathname]!

  const clientSlug = pathname.match(/^\/home\/clients\/([^/]+)\/?$/)?.[1]
  if (clientSlug) {
    return [
      HOME,
      CLIENTS,
      { label: options.resolveClientName?.(clientSlug) ?? clientSlug },
    ]
  }

  const sourceSlug = pathname.match(/^\/home\/sources\/([^/]+)\/?$/)?.[1]
  if (sourceSlug) {
    return [
      HOME,
      SOURCES,
      { label: options.resolveSourceTitle?.(sourceSlug) ?? sourceSlug },
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
  CLIENTS,
  HOME,
  NAV_GROUPS,
  SOURCES,
  deriveAppCrumbs,
  flattenNavItems,
  pickActiveNavItemId,
}
