import {
  canChangeMemberRole,
  canEditRolePermissions,
  canRemoveMember,
} from "@/features/workspaces/policy"
import type {
  CapabilityId,
  JoinableWorkspace,
  Workspace,
  WorkspaceIconKind,
  WorkspaceRole,
  WorkspaceSensitivity,
  WorkspaceTone,
} from "@/features/workspaces/types"

export type WorkspaceFeatureState = {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  activeId: string
  active: Workspace
}

export type WorkspaceCommandError =
  | "workspace_not_found"
  | "invalid_email"
  | "owner_invite_forbidden"
  | "duplicate_invite"
  | "seat_limit_reached"
  | "member_not_found"
  | "owner_role_locked"
  | "member_remove_forbidden"
  | "role_change_forbidden"
  | "permissions_forbidden"
  | "owner_permissions_locked"

export type WorkspaceCommandResult = {
  state: WorkspaceFeatureState
  error?: WorkspaceCommandError
}

export type WorkspaceProfilePatch = {
  name?: string
  handle?: string
  description?: string
  icon?: WorkspaceIconKind
  accent?: WorkspaceTone
}

export function createWorkspaceFeatureState({
  workspaces,
  joinableWorkspaces,
  preferredActiveId,
}: {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  preferredActiveId?: string | null
}): WorkspaceFeatureState {
  if (workspaces.length === 0) {
    throw new Error("WorkspaceFeatureState requires at least one workspace")
  }

  const activeId = workspaces.some((workspace) => workspace.id === preferredActiveId)
    ? preferredActiveId!
    : workspaces[0]!.id

  return withActive({ workspaces, joinableWorkspaces, activeId })
}

export function switchWorkspace(
  state: WorkspaceFeatureState,
  id: string
): WorkspaceCommandResult {
  if (!state.workspaces.some((workspace) => workspace.id === id)) {
    return { state, error: "workspace_not_found" }
  }

  return { state: withActive({ ...state, activeId: id }) }
}

export function updateWorkspaceProfile(
  state: WorkspaceFeatureState,
  patch: WorkspaceProfilePatch
): WorkspaceCommandResult {
  return updateActive(state, {
    ...patch,
    handle:
      patch.handle === undefined
        ? undefined
        : patch.handle.toLowerCase().replace(/[^a-z0-9-]/g, ""),
  })
}

export function inviteMember(
  state: WorkspaceFeatureState,
  {
    email,
    role,
  }: {
    email: string
    role: WorkspaceRole
  }
): WorkspaceCommandResult {
  const normalized = email.trim().toLowerCase()
  if (!normalized.includes("@")) return { state, error: "invalid_email" }
  if (role === "owner") return { state, error: "owner_invite_forbidden" }

  const workspace = state.active
  const usedSeats = workspace.members.length + workspace.invites.length
  if (
    workspace.members.some((member) => member.email.toLowerCase() === normalized) ||
    workspace.invites.some((invite) => invite.email.toLowerCase() === normalized)
  ) {
    return { state, error: "duplicate_invite" }
  }
  if (usedSeats >= workspace.plan.seats) {
    return { state, error: "seat_limit_reached" }
  }

  return updateActive(state, {
    invites: [
      ...workspace.invites,
      { email: normalized, role, invitedAt: "Just now", invitedBy: "You" },
    ],
  })
}

export function changeMemberRole(
  state: WorkspaceFeatureState,
  {
    memberId,
    role,
  }: {
    memberId: string
    role: WorkspaceRole
  }
): WorkspaceCommandResult {
  const member = state.active.members.find((candidate) => candidate.id === memberId)
  if (!member) return { state, error: "member_not_found" }
  if (member.role === "owner") return { state, error: "owner_role_locked" }
  if (!canChangeMemberRole(state.active.role, member)) {
    return { state, error: "role_change_forbidden" }
  }

  return updateActive(state, {
    members: state.active.members.map((candidate) =>
      candidate.id === memberId ? { ...candidate, role } : candidate
    ),
  })
}

export function removeMember(
  state: WorkspaceFeatureState,
  { memberId }: { memberId: string }
): WorkspaceCommandResult {
  const member = state.active.members.find((candidate) => candidate.id === memberId)
  if (!member) return { state, error: "member_not_found" }
  if (!canRemoveMember(state.active.role, member)) {
    return { state, error: "member_remove_forbidden" }
  }

  return updateActive(state, {
    members: state.active.members.filter((candidate) => candidate.id !== memberId),
  })
}

export function toggleCapability(
  state: WorkspaceFeatureState,
  {
    role,
    capability,
  }: {
    role: WorkspaceRole
    capability: CapabilityId
  }
): WorkspaceCommandResult {
  if (role === "owner") return { state, error: "owner_permissions_locked" }
  if (!canEditRolePermissions(state.active.role)) {
    return { state, error: "permissions_forbidden" }
  }

  const permissions = state.active.permissions
  return updateActive(state, {
    permissions: {
      ...permissions,
      [role]: {
        ...permissions[role],
        [capability]: !permissions[role][capability],
      },
    },
  })
}

export function updateSensitivity(
  state: WorkspaceFeatureState,
  patch: Partial<WorkspaceSensitivity>
): WorkspaceCommandResult {
  return updateActive(state, {
    sensitivity: { ...state.active.sensitivity, ...patch },
  })
}

function updateActive(
  state: WorkspaceFeatureState,
  patch: Partial<Workspace>
): WorkspaceCommandResult {
  const workspaces = state.workspaces.map((workspace) =>
    workspace.id === state.activeId ? { ...workspace, ...patch } : workspace
  )
  return { state: withActive({ ...state, workspaces }) }
}

function withActive({
  workspaces,
  joinableWorkspaces,
  activeId,
}: {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  activeId: string
}): WorkspaceFeatureState {
  const active = workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0]!
  return { workspaces, joinableWorkspaces, activeId: active.id, active }
}
