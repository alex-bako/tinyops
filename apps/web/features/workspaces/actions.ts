"use server"

import { revalidatePath } from "next/cache"

import { createCookieActiveWorkspaceStore } from "@/features/workspaces/active-workspace-cookie"
import {
  createWorkspaceApplication,
  type WorkspaceProfileInput,
  type WorkspaceActionResult,
} from "@/features/workspaces/application"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import type {
  WorkspaceRole,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type WorkspaceActionContext = {
  application: ReturnType<typeof createWorkspaceApplication>
}

type WorkspaceActionContextError = {
  error: "not_authenticated"
}

async function createWorkspaceActionContext(): Promise<
  WorkspaceActionContext | WorkspaceActionContextError
> {
  const supabase = await createServerSupabaseClient()
  const appSession = await readSupabaseAppProfileSession(supabase)
  if (!appSession) return { error: "not_authenticated" }

  const activeWorkspaceStore = createCookieActiveWorkspaceStore()
  const actor = {
    userId: appSession.user.id,
    email: appSession.email ?? null,
    name: appSession.email?.split("@")[0] ?? null,
  }
  const store = createSupabaseWorkspaceStore({
    client: supabase,
    actorUserId: actor.userId,
  })
  const application = createWorkspaceApplication({
    actor,
    store,
    activeWorkspaceStore,
  })

  return {
    application,
  }
}

function revalidateWorkspaceShell() {
  revalidatePath(DEFAULT_SIGNED_IN_PATH, "layout")
}

function isWorkspaceActionContextError(
  context: WorkspaceActionContext | WorkspaceActionContextError
): context is WorkspaceActionContextError {
  return "error" in context
}

async function runWorkspaceAction(
  operation: (
    application: ReturnType<typeof createWorkspaceApplication>
  ) => Promise<WorkspaceActionResult>
): Promise<WorkspaceActionResult> {
  const context = await createWorkspaceActionContext()
  if (isWorkspaceActionContextError(context)) return context

  const result = await operation(context.application)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function switchWorkspaceAction(workspaceId: string) {
  return runWorkspaceAction((application) =>
    application.switchWorkspace(workspaceId)
  )
}

export async function acceptWorkspaceInvitationAction(invitationId: string) {
  return runWorkspaceAction((application) =>
    application.acceptInvitation(invitationId)
  )
}

export async function inviteWorkspaceMemberAction(input: {
  workspaceId: string
  email: string
  role: WorkspaceRole
}) {
  return runWorkspaceAction((application) => application.inviteMember(input))
}

export async function createWorkspaceAction(input: {
  name: string
  handle?: string
  description?: string
}) {
  return runWorkspaceAction((application) => application.createWorkspace(input))
}

export async function updateWorkspaceProfileAction(
  workspaceId: string,
  patch: WorkspaceProfileInput
) {
  return runWorkspaceAction((application) =>
    application.updateProfile(workspaceId, patch)
  )
}

export async function updateWorkspaceSensitivityAction(
  workspaceId: string,
  sensitivity: Partial<WorkspaceSensitivity>
) {
  return runWorkspaceAction((application) =>
    application.updateSensitivity(workspaceId, sensitivity)
  )
}

export async function changeMemberRoleAction(
  membershipId: string,
  role: Exclude<WorkspaceRole, "owner">
) {
  return runWorkspaceAction((application) =>
    application.changeMemberRole(membershipId, role)
  )
}

export async function removeMemberAction(membershipId: string) {
  return runWorkspaceAction((application) =>
    application.removeMember(membershipId)
  )
}

export async function revokeWorkspaceInviteAction(invitationId: string) {
  return runWorkspaceAction((application) =>
    application.revokeInvitation(invitationId)
  )
}

export async function archiveWorkspaceAction(workspaceId: string) {
  return runWorkspaceAction((application) =>
    application.archiveWorkspace(workspaceId)
  )
}
