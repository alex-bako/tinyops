"use server"

import { revalidatePath } from "next/cache"

import { createCookieActiveWorkspaceStore } from "@/features/workspaces/active-workspace-cookie"
import {
  createWorkspaceApplication,
  type WorkspaceProfileInput,
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

async function createWorkspaceActionContext(): Promise<WorkspaceActionContext> {
  const supabase = await createServerSupabaseClient()
  const appSession = await readSupabaseAppProfileSession(supabase)
  const activeWorkspaceStore = createCookieActiveWorkspaceStore()
  const actor = appSession
    ? {
        userId: appSession.user.id,
        email: appSession.email ?? null,
        name: appSession.email?.split("@")[0] ?? null,
      }
    : null
  const store = createSupabaseWorkspaceStore({
    client: supabase,
    actorUserId: actor?.userId ?? "",
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

export async function switchWorkspaceAction(workspaceId: string) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.switchWorkspace(workspaceId)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function acceptWorkspaceInvitationAction(invitationId: string) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.acceptInvitation(invitationId)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function inviteWorkspaceMemberAction(input: {
  workspaceId: string
  email: string
  role: WorkspaceRole
}) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.inviteMember(input)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function createWorkspaceAction(input: {
  name: string
  handle?: string
  description?: string
}) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.createWorkspace(input)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function updateWorkspaceProfileAction(
  workspaceId: string,
  patch: WorkspaceProfileInput
) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.updateProfile(workspaceId, patch)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function updateWorkspaceSensitivityAction(
  workspaceId: string,
  sensitivity: Partial<WorkspaceSensitivity>
) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.updateSensitivity(
    workspaceId,
    sensitivity
  )
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function changeMemberRoleAction(
  membershipId: string,
  role: Exclude<WorkspaceRole, "owner">
) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.changeMemberRole(membershipId, role)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function removeMemberAction(membershipId: string) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.removeMember(membershipId)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function revokeWorkspaceInviteAction(invitationId: string) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.revokeInvitation(invitationId)
  if (result.data) revalidateWorkspaceShell()
  return result
}

export async function archiveWorkspaceAction(workspaceId: string) {
  const context = await createWorkspaceActionContext()
  const result = await context.application.archiveWorkspace(workspaceId)
  if (result.data) revalidateWorkspaceShell()
  return result
}
