import type { WorkspaceRole } from "@/features/workspaces/types"

/**
 * Properties are managed alongside notes on the client detail page, so they
 * share the same gate: only owners and admins may create, edit, delete, or
 * reorder them. Everyone else sees a read-only panel.
 */
export function canManageProperties(role: WorkspaceRole): boolean {
  return role === "owner" || role === "admin"
}
