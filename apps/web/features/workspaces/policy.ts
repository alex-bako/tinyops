import type {
  Workspace,
  WorkspaceMember,
  WorkspaceRole,
} from "@/features/workspaces/types"

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin"
}

export function canEditRolePermissions(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin"
}

export function canViewBilling(role: WorkspaceRole): boolean {
  return role === "owner"
}

export function canLeaveWorkspace(workspace: Workspace): boolean {
  return workspace.role !== "owner"
}

export function canRemoveMember(
  actorRole: WorkspaceRole,
  member: WorkspaceMember
): boolean {
  return canManageMembers(actorRole) && member.role !== "owner" && !member.you
}

export function canChangeMemberRole(
  actorRole: WorkspaceRole,
  member: WorkspaceMember
): boolean {
  return canManageMembers(actorRole) && member.role !== "owner"
}
