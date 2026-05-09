import type { WorkspaceRole } from "@/features/workspaces/types"

export function canManageSources(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin"
}
