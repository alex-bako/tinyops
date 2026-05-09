import type { ActiveWorkspaceStore } from "@/features/workspaces/active-workspace"
import {
  acceptWorkspaceInvitationForUser,
  archiveWorkspaceForUser,
  changeWorkspaceMemberRoleForUser,
  ensureWorkspaceFeatureData,
  inviteWorkspaceMember,
  removeWorkspaceMemberForUser,
  revokeWorkspaceInvitationForUser,
  slugify,
  updateWorkspaceProfileForUser,
  updateWorkspaceSensitivityForUser,
  type WorkspaceFeatureDataWithActive,
  type WorkspaceProfilePatch,
  type WorkspaceActor,
  type WorkspaceStore,
} from "@/features/workspaces/use-cases"
import type {
  WorkspaceFeatureData,
  WorkspaceRole,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"

export type WorkspaceActionError =
  | "not_authenticated"
  | "workspace_not_found"
  | "invalid_email"
  | "invalid_workspace_name"
  | "owner_invite_forbidden"
  | "duplicate_invite"
  | "seat_limit_reached"
  | "invite_forbidden"
  | "invite_revoke_forbidden"
  | "archive_forbidden"
  | "member_not_found"
  | "owner_role_locked"
  | "member_remove_forbidden"
  | "role_change_forbidden"
  | "workspace_update_forbidden"
  | "sensitivity_update_forbidden"
  | "workspace_action_failed"

export type WorkspaceActionResult =
  | { data: WorkspaceFeatureDataWithActive; error?: never }
  | { data?: never; error: WorkspaceActionError }

export type WorkspaceProfileInput = WorkspaceProfilePatch

export type WorkspaceApplicationStore = WorkspaceStore

export function createWorkspaceApplication({
  actor,
  store,
  activeWorkspaceStore,
}: {
  actor: WorkspaceActor | null
  store: WorkspaceApplicationStore
  activeWorkspaceStore: ActiveWorkspaceStore
}) {
  async function loadFeatureData(): Promise<WorkspaceFeatureData> {
    if (!actor) {
      return {
        workspaces: [],
        joinableWorkspaces: [],
        usageByWorkspaceId: {},
        activeWorkspaceId: null,
      }
    }

    const activeWorkspaceId = await activeWorkspaceStore.read()
    const data = await ensureWorkspaceFeatureData(
      { ...actor, activeWorkspaceId },
      store
    )
    if (data.activeWorkspaceId) {
      await activeWorkspaceStore.write(data.activeWorkspaceId)
    }
    return data
  }

  async function loadFreshData(
    activeWorkspaceId?: string | null
  ): Promise<WorkspaceActionResult> {
    if (!actor) return { error: "not_authenticated" }

    const data = await ensureWorkspaceFeatureData(
      { ...actor, activeWorkspaceId },
      store
    )
    if (data.activeWorkspaceId) {
      await activeWorkspaceStore.write(data.activeWorkspaceId)
    }
    return { data }
  }

  return {
    loadFeatureData,

    async switchWorkspace(workspaceId: string): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const data = await ensureWorkspaceFeatureData(
          { ...actor, activeWorkspaceId: workspaceId },
          store
        )
        if (data.activeWorkspaceId !== workspaceId) {
          return { error: "workspace_not_found" }
        }
        await activeWorkspaceStore.write(data.activeWorkspaceId)
        return { data }
      } catch {
        return { error: "workspace_action_failed" }
      }
    },

    async createWorkspace(input: {
      name: string
      handle?: string
      description?: string
    }): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const name = input.name.trim()
        const handle = slugify(input.handle || name)
        const created = await store.createWorkspace({
          email: actor.email ?? "",
          name,
          handle,
        })
        if (input.description?.trim()) {
          await updateWorkspaceProfileForUser(
            {
              workspace: created,
              patch: { description: input.description },
            },
            store
          )
        }
        return loadFreshData(created.id)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async acceptInvitation(
      invitationId: string
    ): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const data = await acceptWorkspaceInvitationForUser(
          {
            invitationId,
            userId: actor.userId,
            email: actor.email,
            name: actor.name,
          },
          store
        )
        await activeWorkspaceStore.write(data.activeWorkspaceId)
        return { data }
      } catch {
        return { error: "workspace_action_failed" }
      }
    },

    async inviteMember(input: {
      workspaceId: string
      email: string
      role: WorkspaceRole
    }): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const current = await ensureWorkspaceFeatureData(
          { ...actor, activeWorkspaceId: input.workspaceId },
          store
        )
        const workspace = current.workspaces.find(
          (candidate) => candidate.id === input.workspaceId
        )
        if (!workspace) return { error: "workspace_not_found" }

        await inviteWorkspaceMember(
          {
            workspace,
            email: input.email,
            role: input.role,
          },
          store
        )

        return loadFreshData(input.workspaceId)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async archiveWorkspace(
      workspaceId: string
    ): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const current = await ensureWorkspaceFeatureData(
          { ...actor, activeWorkspaceId: workspaceId },
          store
        )
        const workspace = current.workspaces.find(
          (candidate) => candidate.id === workspaceId
        )
        if (!workspace) return { error: "workspace_not_found" }

        const data = await archiveWorkspaceForUser(
          {
            actorUserId: actor.userId,
            workspace,
            email: actor.email,
            name: actor.name,
          },
          store
        )
        await activeWorkspaceStore.write(data.activeWorkspaceId)
        return { data }
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async updateProfile(
      workspaceId: string,
      patch: WorkspaceProfileInput
    ): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const workspace = await loadVisibleWorkspace(actor, store, workspaceId)
        await updateWorkspaceProfileForUser({ workspace, patch }, store)
        return loadFreshData(workspaceId)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async updateSensitivity(
      workspaceId: string,
      sensitivity: Partial<WorkspaceSensitivity>
    ): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const workspace = await loadVisibleWorkspace(actor, store, workspaceId)
        await updateWorkspaceSensitivityForUser(
          { workspace, sensitivity },
          store
        )
        return loadFreshData(workspaceId)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async changeMemberRole(
      membershipId: string,
      role: Exclude<WorkspaceRole, "owner">
    ): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const workspace = await loadWorkspaceContainingMember(
          actor,
          store,
          membershipId
        )
        await changeWorkspaceMemberRoleForUser(
          { workspace, membershipId, role },
          store
        )
        return loadFreshData(workspace.id)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async removeMember(membershipId: string): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const workspace = await loadWorkspaceContainingMember(
          actor,
          store,
          membershipId
        )
        await removeWorkspaceMemberForUser({ workspace, membershipId }, store)
        return loadFreshData(workspace.id)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },

    async revokeInvitation(
      invitationId: string
    ): Promise<WorkspaceActionResult> {
      if (!actor) return { error: "not_authenticated" }

      try {
        const workspace = await loadWorkspaceContainingInvite(
          actor,
          store,
          invitationId
        )
        await revokeWorkspaceInvitationForUser(
          { workspace, invitationId },
          store
        )
        return loadFreshData(workspace.id)
      } catch (error) {
        return { error: mapWorkspaceActionError(error) }
      }
    },
  }
}

async function loadVisibleWorkspace(
  actor: WorkspaceActor,
  store: WorkspaceStore,
  workspaceId: string
) {
  const data = await ensureWorkspaceFeatureData(
    { ...actor, activeWorkspaceId: workspaceId },
    store
  )
  const workspace = data.workspaces.find(
    (candidate) => candidate.id === workspaceId
  )
  if (!workspace) throw new Error("workspace_not_found")
  return workspace
}

async function loadWorkspaceContainingMember(
  actor: WorkspaceActor,
  store: WorkspaceStore,
  membershipId: string
) {
  const data = await ensureWorkspaceFeatureData(actor, store)
  const workspace = data.workspaces.find((candidate) =>
    candidate.members.some((member) => member.id === membershipId)
  )
  if (!workspace) throw new Error("member_not_found")
  return workspace
}

async function loadWorkspaceContainingInvite(
  actor: WorkspaceActor,
  store: WorkspaceStore,
  invitationId: string
) {
  const data = await ensureWorkspaceFeatureData(actor, store)
  const workspace = data.workspaces.find((candidate) =>
    candidate.invites.some((invite) => invite.id === invitationId)
  )
  if (!workspace) throw new Error("invite_not_found")
  return workspace
}

const WORKSPACE_ACTION_ERRORS = new Set<WorkspaceActionError>([
  "not_authenticated",
  "workspace_not_found",
  "invalid_email",
  "invalid_workspace_name",
  "owner_invite_forbidden",
  "duplicate_invite",
  "seat_limit_reached",
  "invite_forbidden",
  "invite_revoke_forbidden",
  "archive_forbidden",
  "member_not_found",
  "owner_role_locked",
  "member_remove_forbidden",
  "role_change_forbidden",
  "workspace_update_forbidden",
  "sensitivity_update_forbidden",
  "workspace_action_failed",
])

function mapWorkspaceActionError(error: unknown): WorkspaceActionError {
  if (error instanceof Error) {
    const message = error.message as WorkspaceActionError
    if (WORKSPACE_ACTION_ERRORS.has(message)) return message
  }
  return "workspace_action_failed"
}
