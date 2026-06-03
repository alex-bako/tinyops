import type { WorkspaceRole } from "@/features/workspaces/types"

export function canManageNotes(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin"
}
