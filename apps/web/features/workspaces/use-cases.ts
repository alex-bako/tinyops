import { normalizeEmail } from "@/lib/auth/email"
import { resolveActiveWorkspaceId } from "@/features/workspaces/active-workspace"
import {
  canChangeMemberRole,
  canManageMembers,
  canRemoveMember,
} from "@/features/workspaces/policy"
import type {
  Workspace,
  WorkspaceFeatureData,
  WorkspaceIconKind,
  WorkspaceRole,
  WorkspaceSensitivity,
  WorkspaceUsageSnapshot,
} from "@/features/workspaces/types"
import { EMPTY_WORKSPACE_USAGE } from "@/features/workspaces/types"

export type WorkspaceInviteRecord = {
  id: string
  workspaceId: string
  email: string
  role: Exclude<WorkspaceRole, "owner">
}

export type WorkspaceStore = {
  listWorkspaces(): Promise<Workspace[]>
  listJoinableWorkspaces(
    email: string
  ): Promise<WorkspaceFeatureData["joinableWorkspaces"]>
  createWorkspace(input: {
    email: string
    name: string
    handle: string
  }): Promise<Workspace>
  createWorkspaceInvite(input: {
    workspaceId: string
    email: string
    role: Exclude<WorkspaceRole, "owner">
  }): Promise<WorkspaceInviteRecord>
  acceptWorkspaceInvitation(input: {
    invitationId: string
    email: string
  }): Promise<{ workspaceId: string }>
  archiveWorkspace(workspaceId: string): Promise<void>
  updateWorkspaceProfile(input: {
    workspaceId: string
    name?: string
    handle?: string
    description?: string
    icon?: WorkspaceIconKind
    accent?: string
  }): Promise<void>
  updateWorkspaceSensitivity(input: {
    workspaceId: string
    sensitivity: Partial<WorkspaceSensitivity>
  }): Promise<void>
  changeMemberRole(input: {
    membershipId: string
    role: Exclude<WorkspaceRole, "owner">
  }): Promise<void>
  removeMember(membershipId: string): Promise<void>
  revokeWorkspaceInvite(invitationId: string): Promise<void>
}

export type WorkspaceSession = {
  userId: string
  email: string | null
  name: string | null
  activeWorkspaceId?: string | null
}

export type WorkspaceActor = {
  userId: string
  email: string | null
  name: string | null
}

export type WorkspaceProfilePatch = {
  name?: string
  handle?: string
  description?: string
  icon?: WorkspaceIconKind
  accent?: string
}

export async function ensureWorkspaceFeatureData(
  session: WorkspaceSession,
  store: WorkspaceStore
): Promise<WorkspaceFeatureData> {
  const email = normalizeEmail(session.email)
  if (!email) {
    throw new Error("Workspace feature requires an authenticated email")
  }

  const workspaces = await store.listWorkspaces()

  const activeWorkspaceId =
    resolveActiveWorkspaceId(workspaces, session.activeWorkspaceId) ?? null

  return {
    workspaces,
    joinableWorkspaces: await store.listJoinableWorkspaces(email),
    usageByWorkspaceId: emptyUsageByWorkspaceId(workspaces),
    activeWorkspaceId,
  }
}

export async function inviteWorkspaceMember(
  input: {
    workspace: Workspace
    email: string
    role: WorkspaceRole
  },
  store: WorkspaceStore
) {
  const email = normalizeEmail(input.email)
  if (!email) throw new Error("invalid_email")
  if (input.role === "owner") throw new Error("owner_invite_forbidden")
  if (!canManageMembers(input.workspace.role))
    throw new Error("invite_forbidden")

  const usedSeats =
    input.workspace.members.length + input.workspace.invites.length
  if (usedSeats >= input.workspace.plan.seats) {
    throw new Error("seat_limit_reached")
  }

  const duplicateMember = input.workspace.members.some(
    (member) => member.email.toLowerCase() === email
  )
  const duplicateInvite = input.workspace.invites.some(
    (invite) => invite.email.toLowerCase() === email
  )
  if (duplicateMember || duplicateInvite) throw new Error("duplicate_invite")

  const role = input.role
  await store.createWorkspaceInvite({
    workspaceId: input.workspace.id,
    email,
    role,
  })
}

export async function archiveWorkspaceForUser(
  input: {
    actorUserId: string
    workspace: Workspace
    email: string | null
    name: string | null
  },
  store: WorkspaceStore
) {
  if (input.workspace.role !== "owner") throw new Error("archive_forbidden")

  await store.archiveWorkspace(input.workspace.id)

  return ensureWorkspaceFeatureData(
    {
      userId: input.actorUserId,
      email: input.email,
      name: input.name,
      activeWorkspaceId: null,
    },
    store
  )
}

export async function acceptWorkspaceInvitationForUser(
  input: {
    invitationId: string
    userId: string
    email: string | null
    name: string | null
  },
  store: WorkspaceStore
) {
  const email = normalizeEmail(input.email)
  if (!email) throw new Error("invalid_email")

  const accepted = await store.acceptWorkspaceInvitation({
    invitationId: input.invitationId,
    email,
  })

  return ensureWorkspaceFeatureData(
    {
      userId: input.userId,
      email,
      name: input.name,
      activeWorkspaceId: accepted.workspaceId,
    },
    store
  )
}

export async function updateWorkspaceProfileForUser(
  input: {
    workspace: Workspace
    patch: WorkspaceProfilePatch
  },
  store: WorkspaceStore
) {
  if (!canManageMembers(input.workspace.role)) {
    throw new Error("workspace_update_forbidden")
  }

  const patch: WorkspaceProfilePatch = {}
  if (input.patch.name !== undefined) {
    const name = input.patch.name.trim()
    if (!name) throw new Error("invalid_workspace_name")
    patch.name = name
  }
  if (input.patch.handle !== undefined) {
    patch.handle = slugify(input.patch.handle)
  }
  if (input.patch.description !== undefined) {
    patch.description = input.patch.description.trim()
  }
  if (input.patch.icon !== undefined) patch.icon = input.patch.icon
  if (input.patch.accent !== undefined) patch.accent = input.patch.accent

  await store.updateWorkspaceProfile({
    workspaceId: input.workspace.id,
    ...patch,
  })
}

export async function updateWorkspaceSensitivityForUser(
  input: {
    workspace: Workspace
    sensitivity: Partial<WorkspaceSensitivity>
  },
  store: WorkspaceStore
) {
  if (!canManageMembers(input.workspace.role)) {
    throw new Error("sensitivity_update_forbidden")
  }

  await store.updateWorkspaceSensitivity({
    workspaceId: input.workspace.id,
    sensitivity: sanitizeSensitivityPatch(input.sensitivity),
  })
}

export async function changeWorkspaceMemberRoleForUser(
  input: {
    workspace: Workspace
    membershipId: string
    role: WorkspaceRole
  },
  store: WorkspaceStore
) {
  const member = input.workspace.members.find(
    (candidate) => candidate.id === input.membershipId
  )
  if (!member) throw new Error("member_not_found")
  if (member.role === "owner" || input.role === "owner") {
    throw new Error("owner_role_locked")
  }
  if (!canChangeMemberRole(input.workspace.role, member)) {
    throw new Error("role_change_forbidden")
  }

  await store.changeMemberRole({
    membershipId: input.membershipId,
    role: input.role,
  })
}

export async function removeWorkspaceMemberForUser(
  input: {
    workspace: Workspace
    membershipId: string
  },
  store: WorkspaceStore
) {
  const member = input.workspace.members.find(
    (candidate) => candidate.id === input.membershipId
  )
  if (!member) throw new Error("member_not_found")
  if (!canRemoveMember(input.workspace.role, member)) {
    throw new Error("member_remove_forbidden")
  }

  await store.removeMember(input.membershipId)
}

export async function revokeWorkspaceInvitationForUser(
  input: {
    workspace: Workspace
    invitationId: string
  },
  store: WorkspaceStore
) {
  if (!canManageMembers(input.workspace.role)) {
    throw new Error("invite_revoke_forbidden")
  }
  if (
    !input.workspace.invites.some((invite) => invite.id === input.invitationId)
  ) {
    throw new Error("invite_not_found")
  }

  await store.revokeWorkspaceInvite(input.invitationId)
}

export function slugify(value: string) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")

  return slug || "workspace"
}

function sanitizeSensitivityPatch(
  sensitivity: Partial<WorkspaceSensitivity>
): Partial<WorkspaceSensitivity> {
  return {
    ...sensitivity,
    ...(sensitivity.manualReviewKeywords
      ? {
          manualReviewKeywords: sensitivity.manualReviewKeywords.flatMap(
            (keyword) => {
              const normalized = keyword.trim().toLowerCase()
              return normalized ? [normalized] : []
            }
          ),
        }
      : {}),
  }
}

function emptyUsageByWorkspaceId(
  workspaces: Workspace[]
): Record<string, WorkspaceUsageSnapshot> {
  return Object.fromEntries(
    workspaces.map((workspace) => [workspace.id, EMPTY_WORKSPACE_USAGE])
  )
}
