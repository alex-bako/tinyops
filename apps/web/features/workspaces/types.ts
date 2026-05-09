export const WORKSPACE_TONES = [
  "cobalt",
  "citron",
  "coral",
  "mint",
  "slate",
] as const

export type WorkspaceTone = (typeof WORKSPACE_TONES)[number]

export type WorkspaceRole =
  | "owner"
  | "admin"
  | "operator"
  | "reviewer"
  | "viewer"

export type WorkspaceIconKind =
  | { kind: "mark" }
  | { kind: "letter"; letter: string; tone: WorkspaceTone }

export type SensitivityMode = "strict" | "balanced" | "lenient"
export type AutoSendThreshold = "low-only" | "low-and-medium" | "everything"

export type WorkspaceSensitivity = {
  mode: SensitivityMode
  autoSendThreshold: AutoSendThreshold
  manualReviewKeywords: string[]
  excludeFromOutbound: boolean
}

export type WorkspaceMember = {
  id: string
  name: string
  email: string
  role: WorkspaceRole
  joined: string
  lastActive: string
  you?: boolean
}

export type WorkspaceInvite = {
  email: string
  role: WorkspaceRole
  invitedAt: string
  invitedBy: string
}

export type WorkspacePlan = {
  tier: "Solo" | "Team" | "Studio"
  price: string
  seats: number
}

export type WorkspaceCounts = {
  clients: number
  sources: number
  drafts: number
}

export type WorkspaceSidebarCounts = {
  clients: number
  tasks: number
  march: number
  feedback: number
  dnc: number
}

export type CapabilityId =
  | "view_clients"
  | "edit_clients"
  | "create_drafts"
  | "send_drafts"
  | "approve_sensitive"
  | "manage_sources"
  | "manage_members"
  | "manage_workspace"
  | "manage_billing"
  | "delete_workspace"

export type Permissions = Record<WorkspaceRole, Record<CapabilityId, boolean>>

export type Workspace = {
  id: string
  name: string
  handle: string
  description: string
  icon: WorkspaceIconKind
  accent: WorkspaceTone
  type: string
  role: WorkspaceRole
  plan: WorkspacePlan
  counts: WorkspaceCounts
  sidebarCounts: WorkspaceSidebarCounts
  sensitivity: WorkspaceSensitivity
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
  permissions: Permissions
}

export type JoinableWorkspace = {
  name: string
  handle: string
  icon: WorkspaceIconKind
  members: number
  hint: string
}

export type RoleDef = {
  label: string
  blurb: string
  tone: WorkspaceTone
}

export type CapabilityDef = {
  id: CapabilityId
  label: string
  sensitive?: boolean
  destructive?: boolean
}
