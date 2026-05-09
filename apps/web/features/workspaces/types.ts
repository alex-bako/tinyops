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
export type WorkspaceVertical =
  | "therapy"
  | "coaching"
  | "course"
  | "agency"
  | "other"
export type WorkspaceInitialSourceIntent = "imap" | "csv" | "forms" | "skip"

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
  joinedAt: string
  lastActiveAt: string | null
  you?: boolean
}

export type WorkspaceInvite = {
  id: string
  email: string
  role: WorkspaceRole
  createdAt: string
  invitedByEmail: string | null
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

export type WorkspaceUsageSnapshot = {
  counts: WorkspaceCounts
  sidebarCounts: WorkspaceSidebarCounts
}

export const EMPTY_WORKSPACE_USAGE: WorkspaceUsageSnapshot = {
  counts: { clients: 0, sources: 0, drafts: 0 },
  sidebarCounts: { clients: 0, tasks: 0, march: 0, feedback: 0, dnc: 0 },
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
  vertical: WorkspaceVertical
  defaultSenderName: string
  initialSourceIntent: WorkspaceInitialSourceIntent
  role: WorkspaceRole
  plan: WorkspacePlan
  sensitivity: WorkspaceSensitivity
  members: WorkspaceMember[]
  invites: WorkspaceInvite[]
}

export type WorkspaceFeatureData = {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  usageByWorkspaceId: Record<string, WorkspaceUsageSnapshot>
  activeWorkspaceId?: string | null
}

export type JoinableWorkspace = {
  invitationId: string
  workspaceId: string
  name: string
  handle: string
  icon: WorkspaceIconKind
  members: number
  role: Exclude<WorkspaceRole, "owner">
  invitedByEmail: string | null
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
