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

const NAV_GROUPS: NavGroup[] = [
  {
    id: "primary",
    items: [
      { id: "home", label: "Home", icon: HomeIcon, href: "/home" },
      {
        id: "clients",
        label: "Clients",
        icon: UsersIcon,
        count: 142,
        href: "/home/clients",
      },
      { id: "tasks", label: "Tasks", icon: ListTodoIcon, count: 3 },
      { id: "sources", label: "Data sources", icon: PlugZapIcon },
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
    items: [{ id: "settings", label: "Settings", icon: Settings2Icon }],
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
  options: { resolveClientName?: (slug: string) => string | undefined } = {}
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

  const match = Object.keys(ROUTE_CRUMBS)
    .filter((route) => pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0]
  if (match) return ROUTE_CRUMBS[match]!
  return [{ icon: HomeIcon, label: "Home" }]
}

export {
  CLIENTS,
  HOME,
  NAV_GROUPS,
  deriveAppCrumbs,
  flattenNavItems,
  pickActiveNavItemId,
}
