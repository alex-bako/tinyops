import type {
  JoinableWorkspace,
  Workspace,
  WorkspaceIconKind,
  WorkspaceInvite,
  WorkspaceMember,
  WorkspaceRole,
  WorkspaceInitialSourceIntent,
  WorkspaceTone,
  WorkspaceVertical,
} from "@/features/workspaces/types"

export type WorkspaceRow = {
  id: string
  name: string
  handle: string
  description: string
  icon_kind: string
  icon_letter: string | null
  icon_tone: string
  accent: string
  plan_tier: string
  plan_price: string
  plan_seats: number
  sensitivity_mode: string
  auto_send_threshold: string
  manual_review_keywords: string[]
  exclude_from_outbound: boolean
  vertical?: string | null
  default_sender_name?: string | null
  initial_source_intent?: string | null
  workspace_memberships?: WorkspaceMembershipRow[]
  workspace_invitations?: WorkspaceInvitationRow[]
}

export type WorkspaceMembershipRow = {
  id: string
  user_id: string
  role: string
  joined_at: string
  last_active_at: string | null
  profiles?: { email: string } | null
}

export type WorkspaceInvitationRow = {
  id: string
  email: string
  role: string
  created_at: string
  accepted_at?: string | null
  revoked_at?: string | null
  profiles?: { email: string } | null
}

export type JoinableWorkspaceRow = {
  id: string
  workspace_id: string
  email: string
  role: string
  created_at: string
  workspaces: {
    id: string
    name: string
    handle: string
    icon_kind: string
    icon_letter: string | null
    icon_tone: string
    workspace_memberships?: { id: string }[]
  } | null
  profiles?: { email: string } | null
}

const WORKSPACE_ROLES = new Set<WorkspaceRole>([
  "owner",
  "admin",
  "operator",
  "reviewer",
  "viewer",
])

const WORKSPACE_TONES = new Set<WorkspaceTone>([
  "cobalt",
  "citron",
  "coral",
  "mint",
  "slate",
])

export function mapWorkspaceRow(
  row: WorkspaceRow,
  options: { userId: string }
): Workspace {
  const members = (row.workspace_memberships ?? []).map((membership) =>
    mapWorkspaceMember(membership, options.userId)
  )
  const role =
    members.find((member) => member.you)?.role ??
    coerceWorkspaceRole(row.workspace_memberships?.[0]?.role, "viewer")

  return {
    id: row.id,
    name: row.name,
    handle: row.handle,
    description: row.description,
    icon: mapIcon(row.icon_kind, row.icon_letter, row.icon_tone),
    accent: coerceTone(row.accent),
    vertical: coerceVertical(row.vertical),
    defaultSenderName: row.default_sender_name ?? "",
    initialSourceIntent: coerceInitialSourceIntent(row.initial_source_intent),
    role,
    plan: {
      tier: coercePlanTier(row.plan_tier),
      price: row.plan_price,
      seats: row.plan_seats,
    },
    sensitivity: {
      mode: coerceSensitivityMode(row.sensitivity_mode),
      autoSendThreshold: coerceAutoSendThreshold(row.auto_send_threshold),
      manualReviewKeywords: row.manual_review_keywords,
      excludeFromOutbound: row.exclude_from_outbound,
    },
    members,
    invites: (row.workspace_invitations ?? [])
      .filter((invite) => !invite.accepted_at && !invite.revoked_at)
      .map((invite) => mapWorkspaceInvite(invite)),
  }
}

export function mapWorkspaceInvitationRow(
  row: JoinableWorkspaceRow
): JoinableWorkspace {
  if (!row.workspaces) {
    throw new Error("Workspace invitation row is missing workspace")
  }

  return {
    invitationId: row.id,
    workspaceId: row.workspace_id,
    name: row.workspaces.name,
    handle: row.workspaces.handle,
    icon: mapIcon(
      row.workspaces.icon_kind,
      row.workspaces.icon_letter,
      row.workspaces.icon_tone
    ),
    members: row.workspaces.workspace_memberships?.length ?? 0,
    role: coerceInvitableRole(row.role),
    invitedByEmail: row.profiles?.email ?? null,
  }
}

function mapWorkspaceMember(
  membership: WorkspaceMembershipRow,
  userId: string
): WorkspaceMember {
  const email = membership.profiles?.email ?? "member@example.co"
  const you = membership.user_id === userId

  return {
    id: membership.id,
    name: nameFromEmail(email),
    email,
    role: coerceWorkspaceRole(membership.role, "viewer"),
    joinedAt: membership.joined_at,
    lastActiveAt: membership.last_active_at,
    ...(you ? { you: true } : {}),
  }
}

function mapWorkspaceInvite(
  invitation: WorkspaceInvitationRow
): WorkspaceInvite {
  return {
    id: invitation.id,
    email: invitation.email,
    role: coerceWorkspaceRole(invitation.role, "viewer"),
    createdAt: invitation.created_at,
    invitedByEmail: invitation.profiles?.email ?? null,
  }
}

function mapIcon(
  kind: string,
  letter: string | null,
  tone: string
): WorkspaceIconKind {
  if (kind === "letter" && letter) {
    return { kind: "letter", letter, tone: coerceTone(tone) }
  }

  return { kind: "mark" }
}

function coerceTone(value: string): WorkspaceTone {
  return WORKSPACE_TONES.has(value as WorkspaceTone)
    ? (value as WorkspaceTone)
    : "cobalt"
}

function coerceWorkspaceRole(
  value: string | undefined,
  fallback: WorkspaceRole
) {
  return WORKSPACE_ROLES.has(value as WorkspaceRole)
    ? (value as WorkspaceRole)
    : fallback
}

function coerceInvitableRole(value: string): Exclude<WorkspaceRole, "owner"> {
  const role = coerceWorkspaceRole(value, "viewer")
  return role === "owner" ? "viewer" : role
}

function coercePlanTier(value: string): Workspace["plan"]["tier"] {
  if (value === "Solo" || value === "Studio") return value
  return "Team"
}

function coerceSensitivityMode(
  value: string
): Workspace["sensitivity"]["mode"] {
  if (value === "balanced" || value === "lenient") return value
  return "strict"
}

function coerceAutoSendThreshold(
  value: string
): Workspace["sensitivity"]["autoSendThreshold"] {
  if (value === "low-and-medium" || value === "everything") return value
  return "low-only"
}

function coerceVertical(value: string | null | undefined): WorkspaceVertical {
  if (
    value === "therapy" ||
    value === "coaching" ||
    value === "course" ||
    value === "agency"
  ) {
    return value
  }
  return "other"
}

function coerceInitialSourceIntent(
  value: string | null | undefined
): WorkspaceInitialSourceIntent {
  if (value === "imap" || value === "csv" || value === "forms") return value
  return "skip"
}

function nameFromEmail(email: string | null | undefined) {
  return email?.split("@")[0] || "member"
}
