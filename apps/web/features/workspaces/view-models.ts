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
import type { WorkspaceFeatureState } from "@/features/workspaces/state"
import type {
  JoinableWorkspace,
  RoleDef,
  Workspace,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceSidebarCounts,
  WorkspaceUsageSnapshot,
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
    sections: SETTINGS_SECTIONS.flatMap((section) =>
      section.id !== "billing" || canViewBilling(role)
        ? [{ ...section, active: section.id === active }]
        : []
    ),
  }
}

export type WorkspaceSwitcherView = {
  account: { name: string; email: string }
  active: WorkspaceSwitcherRow
  activeRole: RoleDef
  switchRows: WorkspaceSwitcherRow[]
  invitationRows: JoinableWorkspaceView[]
}

export type JoinableWorkspaceView = JoinableWorkspace & {
  hint: string
}

export type WorkspaceSwitcherRow = Pick<
  Workspace,
  "id" | "name" | "handle" | "icon" | "role"
> & {
  roleDef: RoleDef
  type: string
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
    type: workspaceTypeLabel(workspace),
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
    switchRows: state.workspaces.flatMap((workspace) =>
      workspace.id !== state.active.id &&
      matches(workspace.name, workspace.handle)
        ? [toRow(workspace)]
        : []
    ),
    invitationRows: state.joinableWorkspaces.flatMap((workspace) =>
      matches(workspace.name, workspace.handle)
        ? [
            {
              ...workspace,
              hint: `Invited by ${nameFromEmail(workspace.invitedByEmail)}`,
            },
          ]
        : []
    ),
  }
}

export function buildSidebarNavGroups(
  groups: NavGroup[],
  usage: WorkspaceUsageSnapshot
): NavGroup[] {
  return groups.map((group) => ({
    ...group,
    items: group.items.map((item) =>
      withWorkspaceCount(item, usage.sidebarCounts)
    ),
  }))
}

export function workspaceTypeLabel(workspace: Workspace): string {
  const members = workspace.members.length
  return `${workspace.plan.tier} · ${members} ${members === 1 ? "member" : "members"}`
}

function withWorkspaceCount(
  item: NavItem,
  counts: WorkspaceSidebarCounts
): NavItem {
  const key = COUNT_KEYS[item.id]
  if (!key) return item
  return { ...item, count: counts[key] }
}

export type WorkspaceMemberRow = WorkspaceMember & {
  joined: string
  lastActive: string
}

export type WorkspaceInviteRow = WorkspaceInvite & {
  invitedAt: string
  invitedBy: string
}

export function buildWorkspaceMemberRows(
  workspace: Workspace
): WorkspaceMemberRow[] {
  return workspace.members.map((member) => ({
    ...member,
    joined: formatDate(member.joinedAt),
    lastActive: member.you ? "Now" : formatDate(member.lastActiveAt),
  }))
}

export function buildWorkspaceInviteRows(
  workspace: Workspace,
  now?: () => Date
): WorkspaceInviteRow[] {
  return workspace.invites.map((invite) => ({
    ...invite,
    invitedAt: formatRelativeDate(invite.createdAt, now),
    invitedBy: nameFromEmail(invite.invitedByEmail),
  }))
}

function nameFromEmail(email: string | null | undefined) {
  return email?.split("@")[0] || "member"
}

const workspaceDateFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  day: "numeric",
  year: "numeric",
})

function formatDate(value: string | null) {
  if (!value) return "Never"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return workspaceDateFormatter.format(date)
}

function formatRelativeDate(value: string, now: (() => Date) | undefined) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  const elapsed = (now?.() ?? new Date()).getTime() - date.getTime()
  const days = Math.max(0, Math.floor(elapsed / 86_400_000))
  if (days === 0) return "Today"
  if (days === 1) return "1d ago"
  return `${days}d ago`
}
