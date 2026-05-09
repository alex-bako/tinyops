import {
  AlertOctagonIcon,
  BellIcon,
  CreditCardIcon,
  ScrollTextIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
  Trash2Icon,
  UsersIcon,
  type LucideIcon,
} from "lucide-react"

import { ROLE_DEFS } from "@/features/workspaces/catalog"
import { canViewBilling } from "@/features/workspaces/policy"
import type { WorkspaceFeatureState } from "@/features/workspaces/commands"
import type {
  JoinableWorkspace,
  RoleDef,
  Workspace,
  WorkspaceRole,
  WorkspaceSidebarCounts,
} from "@/features/workspaces/types"
import type { NavGroup, NavItem } from "@/lib/navigation"

export type SettingsSectionId =
  | "general"
  | "members"
  | "roles"
  | "sensitivity"
  | "notifications"
  | "billing"
  | "audit"
  | "danger"

export type SettingsSectionView = {
  id: SettingsSectionId
  label: string
  icon: LucideIcon
  danger?: boolean
  active: boolean
}

const SETTINGS_SECTIONS: Omit<SettingsSectionView, "active">[] = [
  { id: "general", label: "General", icon: SlidersHorizontalIcon },
  { id: "members", label: "Members", icon: UsersIcon },
  { id: "roles", label: "Roles & permissions", icon: ShieldCheckIcon },
  { id: "sensitivity", label: "Sensitivity policy", icon: AlertOctagonIcon },
  { id: "notifications", label: "Notifications", icon: BellIcon },
  { id: "billing", label: "Plan & billing", icon: CreditCardIcon },
  { id: "audit", label: "Audit log", icon: ScrollTextIcon },
  { id: "danger", label: "Danger zone", icon: Trash2Icon, danger: true },
]

const COUNT_KEYS: Record<string, keyof WorkspaceSidebarCounts> = {
  clients: "clients",
  tasks: "tasks",
  march: "march",
  feedback: "feedback",
  dnc: "dnc",
}

export function buildSettingsRailView({
  active,
  role,
}: {
  active: SettingsSectionId
  role: WorkspaceRole
}): { sections: SettingsSectionView[] } {
  return {
    sections: SETTINGS_SECTIONS.filter(
      (section) => section.id !== "billing" || canViewBilling(role)
    ).map((section) => ({ ...section, active: section.id === active })),
  }
}

export type WorkspaceSwitcherView = {
  account: { name: string; email: string }
  active: WorkspaceSwitcherRow
  activeRole: RoleDef
  switchRows: WorkspaceSwitcherRow[]
  invitationRows: JoinableWorkspace[]
}

export type WorkspaceSwitcherRow = Pick<
  Workspace,
  "id" | "name" | "handle" | "icon" | "type" | "role"
> & {
  roleDef: RoleDef
}

export function buildWorkspaceSwitcherView(
  state: WorkspaceFeatureState,
  {
    filter,
    userEmail,
    userName,
  }: {
    filter: string
    userEmail?: string | null
    userName: string
  }
): WorkspaceSwitcherView {
  const q = filter.trim().toLowerCase()
  const matches = (name: string, handle?: string) =>
    !q ||
    name.toLowerCase().includes(q) ||
    (handle ?? "").toLowerCase().includes(q)

  const toRow = (workspace: Workspace): WorkspaceSwitcherRow => ({
    id: workspace.id,
    name: workspace.name,
    handle: workspace.handle,
    icon: workspace.icon,
    type: workspace.type,
    role: workspace.role,
    roleDef: ROLE_DEFS[workspace.role],
  })

  return {
    account: {
      name: userName,
      email: userEmail ?? "you@workspace.com",
    },
    active: toRow(state.active),
    activeRole: ROLE_DEFS[state.active.role],
    switchRows: state.workspaces
      .filter((workspace) => workspace.id !== state.active.id)
      .filter((workspace) => matches(workspace.name, workspace.handle))
      .map(toRow),
    invitationRows: state.joinableWorkspaces.filter((workspace) =>
      matches(workspace.name, workspace.handle)
    ),
  }
}

export function buildSidebarNavGroups(
  groups: NavGroup[],
  workspace: Workspace
): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      withWorkspaceCount(item, workspace.sidebarCounts)
    ),
  }))
}

function withWorkspaceCount(
  item: NavItem,
  counts: WorkspaceSidebarCounts
): NavItem {
  const key = COUNT_KEYS[item.id]
  if (!key) return item
  return { ...item, count: counts[key] }
}
