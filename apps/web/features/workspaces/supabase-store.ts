import type { SupabaseClient } from "@supabase/supabase-js"

import {
  mapWorkspaceInvitationRow,
  mapWorkspaceRow,
  type JoinableWorkspaceRow,
  type WorkspaceMembershipRow,
  type WorkspaceRow,
} from "@/features/workspaces/mappers"
import type {
  WorkspaceInviteRecord,
  WorkspaceStore,
} from "@/features/workspaces/use-cases"
import type {
  WorkspaceIconKind,
  WorkspaceRole,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"
import type { Database, Json, TablesUpdate } from "@/lib/database.types"

type WorkspaceSupabaseClient = Pick<SupabaseClient<Database>, "from" | "rpc">

type SupabaseWorkspaceStoreOptions = {
  client: WorkspaceSupabaseClient
  actorUserId: string
  now?: () => Date
}

export type SupabaseWorkspaceStore = WorkspaceStore & {
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

const WORKSPACE_COLUMNS = `
  id,
  name,
  handle,
  description,
  icon_kind,
  icon_letter,
  icon_tone,
  accent,
  plan_tier,
  plan_price,
  plan_seats,
  sensitivity_mode,
  auto_send_threshold,
  manual_review_keywords,
  exclude_from_outbound,
  workspace_memberships (
    id,
    user_id,
    role,
    joined_at,
    last_active_at,
    profiles ( email )
  ),
  workspace_invitations (
    id,
    email,
    role,
    created_at,
    accepted_at,
    revoked_at,
    profiles:invited_by ( email )
  )
`

const JOINABLE_COLUMNS = `
  id,
  workspace_id,
  email,
  role,
  created_at,
  profiles:invited_by ( email ),
  workspaces (
    id,
    name,
    handle,
    icon_kind,
    icon_letter,
    icon_tone,
    workspace_memberships ( id )
  )
`

export function createSupabaseWorkspaceStore({
  client,
  actorUserId,
  now,
}: SupabaseWorkspaceStoreOptions): SupabaseWorkspaceStore {
  return {
    async listWorkspaces() {
      const { data, error } = await client
        .from("workspaces")
        .select(WORKSPACE_COLUMNS)
        .is("archived_at", null)
        .order("created_at", { ascending: true })

      if (error) throw new Error("Could not load workspaces", { cause: error })

      return ((data ?? []) as WorkspaceRow[]).map((row) =>
        mapWorkspaceRow(row, { userId: actorUserId })
      )
    },

    async listJoinableWorkspaces(email) {
      const { data, error } = await client
        .from("workspace_invitations")
        .select(JOINABLE_COLUMNS)
        .eq("email", email)
        .is("accepted_at", null)
        .is("revoked_at", null)
        .order("created_at", { ascending: true })

      if (error) {
        throw new Error("Could not load workspace invitations", {
          cause: error,
        })
      }

      return ((data ?? []) as JoinableWorkspaceRow[]).map((row) =>
        mapWorkspaceInvitationRow(row)
      )
    },

    async createWorkspace(input) {
      const { data, error } = await client.rpc("create_personal_workspace", {
        actor_email: input.email,
        workspace_handle: input.handle,
        workspace_name: input.name,
      })

      if (error) {
        throw new Error("Could not create workspace", { cause: error })
      }

      const workspaceId = String(data)
      const workspaceRow: WorkspaceRow = {
        id: workspaceId,
        name: input.name,
        handle: input.handle,
        description: "",
        icon_kind: "mark",
        icon_letter: null,
        icon_tone: "cobalt",
        accent: "cobalt",
        plan_tier: "Team",
        plan_price: "$0 / alpha",
        plan_seats: 5,
        sensitivity_mode: "strict",
        auto_send_threshold: "low-only",
        manual_review_keywords: ["crisis", "trauma"],
        exclude_from_outbound: true,
      }

      return mapWorkspaceRow(
        {
          ...workspaceRow,
          workspace_memberships: [
            {
              id: actorUserId,
              user_id: actorUserId,
              role: "owner",
              joined_at: (now?.() ?? new Date()).toISOString(),
              last_active_at: null,
              profiles: { email: input.email },
            } satisfies WorkspaceMembershipRow,
          ],
          workspace_invitations: [],
        },
        { userId: actorUserId }
      )
    },

    async createWorkspaceInvite(input): Promise<WorkspaceInviteRecord> {
      const { data, error } = await client.rpc("create_workspace_invitation", {
        target_email: input.email,
        target_role: input.role,
        target_workspace_id: input.workspaceId,
      })

      if (error) {
        throwWorkspaceStoreError(error, "Could not create workspace invite")
      }
      const invitation = rpcJsonObject(data) as {
        id: string
        workspace_id: string
        email: string
        role: WorkspaceInviteRecord["role"]
      }

      return {
        id: invitation.id,
        workspaceId: invitation.workspace_id,
        email: invitation.email,
        role: invitation.role,
      }
    },

    async acceptWorkspaceInvitation(input) {
      const { data, error } = await client.rpc("accept_workspace_invitation", {
        target_invitation_id: input.invitationId,
      })

      if (error) {
        throw new Error("Could not accept workspace invite", { cause: error })
      }

      return { workspaceId: String(data) }
    },

    async archiveWorkspace(workspaceId) {
      const { error } = await client.rpc("archive_workspace", {
        target_workspace_id: workspaceId,
      })

      if (error)
        throw new Error("Could not archive workspace", { cause: error })
    },

    async updateWorkspaceProfile(input) {
      const patch: TablesUpdate<"workspaces"> = {}
      if (input.name !== undefined) patch.name = input.name
      if (input.handle !== undefined) patch.handle = input.handle
      if (input.description !== undefined) patch.description = input.description
      if (input.accent !== undefined) patch.accent = input.accent
      if (input.icon !== undefined) {
        patch.icon_kind = input.icon.kind
        patch.icon_letter =
          input.icon.kind === "letter" ? input.icon.letter.toUpperCase() : null
        patch.icon_tone =
          input.icon.kind === "letter" ? input.icon.tone : "cobalt"
      }

      const { error } = await client
        .from("workspaces")
        .update(patch)
        .eq("id", input.workspaceId)
        .select("id")
        .single()

      if (error) throw new Error("Could not update workspace", { cause: error })
    },

    async updateWorkspaceSensitivity(input) {
      const patch: TablesUpdate<"workspaces"> = {}
      if (input.sensitivity.mode !== undefined) {
        patch.sensitivity_mode = input.sensitivity.mode
      }
      if (input.sensitivity.autoSendThreshold !== undefined) {
        patch.auto_send_threshold = input.sensitivity.autoSendThreshold
      }
      if (input.sensitivity.manualReviewKeywords !== undefined) {
        patch.manual_review_keywords = input.sensitivity.manualReviewKeywords
      }
      if (input.sensitivity.excludeFromOutbound !== undefined) {
        patch.exclude_from_outbound = input.sensitivity.excludeFromOutbound
      }

      const { error } = await client
        .from("workspaces")
        .update(patch)
        .eq("id", input.workspaceId)
        .select("id")
        .single()

      if (error) {
        throw new Error("Could not update workspace sensitivity", {
          cause: error,
        })
      }
    },

    async changeMemberRole(input) {
      const { error } = await client
        .from("workspace_memberships")
        .update({ role: input.role })
        .eq("id", input.membershipId)
        .select("id")
        .single()

      if (error)
        throw new Error("Could not change member role", { cause: error })
    },

    async removeMember(membershipId) {
      const { error } = await client
        .from("workspace_memberships")
        .delete()
        .eq("id", membershipId)

      if (error) throw new Error("Could not remove member", { cause: error })
    },

    async revokeWorkspaceInvite(invitationId) {
      const { error } = await client.rpc("revoke_workspace_invitation", {
        target_invitation_id: invitationId,
      })

      if (error)
        throw new Error("Could not revoke workspace invite", { cause: error })
    },
  }
}

function rpcJsonObject(value: Json): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value
  }

  throw new Error("Workspace RPC returned an invalid payload")
}

const WORKSPACE_STORE_ERRORS = new Set([
  "invalid_email",
  "owner_invite_forbidden",
  "duplicate_invite",
  "seat_limit_reached",
  "workspace_not_found",
])

function throwWorkspaceStoreError(error: unknown, fallback: string): never {
  const message =
    error && typeof error === "object" && "message" in error
      ? String(error.message)
      : null

  if (message && WORKSPACE_STORE_ERRORS.has(message)) {
    throw new Error(message, { cause: error })
  }

  throw new Error(fallback, { cause: error })
}
