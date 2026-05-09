import type {
  CapabilityDef,
  CapabilityId,
  Permissions,
  RoleDef,
  WorkspaceRole,
} from "@/features/workspaces/types"

export const ROLE_ORDER: WorkspaceRole[] = [
  "owner",
  "admin",
  "operator",
  "reviewer",
  "viewer",
]

export const ROLE_DEFS: Record<WorkspaceRole, RoleDef> = {
  owner: { label: "Owner", blurb: "Billing, delete, transfer.", tone: "cobalt" },
  admin: { label: "Admin", blurb: "Members, settings, sources.", tone: "cobalt" },
  operator: {
    label: "Operator",
    blurb: "Read clients, draft + send.",
    tone: "mint",
  },
  reviewer: {
    label: "Reviewer",
    blurb: "Approve drafts only.",
    tone: "citron",
  },
  viewer: { label: "Viewer", blurb: "Read-only access.", tone: "slate" },
}

export const CAPABILITIES: CapabilityDef[] = [
  { id: "view_clients", label: "View clients & timelines" },
  { id: "edit_clients", label: "Edit client profiles" },
  { id: "create_drafts", label: "Generate drafts" },
  { id: "send_drafts", label: "Send approved drafts" },
  { id: "approve_sensitive", label: "Approve sensitive drafts", sensitive: true },
  { id: "manage_sources", label: "Manage data sources" },
  { id: "manage_members", label: "Invite & manage members" },
  { id: "manage_workspace", label: "Edit workspace settings" },
  { id: "manage_billing", label: "Manage plan & billing" },
  { id: "delete_workspace", label: "Delete workspace", destructive: true },
]

function permsFor(predicate: (id: CapabilityId) => boolean) {
  return Object.fromEntries(
    CAPABILITIES.map((capability) => [capability.id, predicate(capability.id)])
  ) as Record<CapabilityId, boolean>
}

export const DEFAULT_PERMISSIONS: Permissions = {
  owner: permsFor(() => true),
  admin: permsFor((id) => id !== "delete_workspace" && id !== "manage_billing"),
  operator: permsFor((id) =>
    ["view_clients", "edit_clients", "create_drafts", "send_drafts"].includes(id)
  ),
  reviewer: permsFor((id) => ["view_clients", "create_drafts"].includes(id)),
  viewer: permsFor((id) => id === "view_clients"),
}
