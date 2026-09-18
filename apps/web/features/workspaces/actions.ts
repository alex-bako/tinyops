"use server"

import { revalidatePath } from "next/cache"

import { createCookieActiveWorkspaceStore } from "@/features/workspaces/active-workspace-cookie"
import {
  createWorkspaceApplication,
  type WorkspaceProfileInput,
  type WorkspaceActionResult,
  type WorkspaceInviteLinkResult,
} from "@/features/workspaces/application"
import { createSupabaseInviteMailer } from "@/features/workspaces/invite-mailer"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import type {
  WorkspaceRole,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { getRequestOrigin } from "@/lib/auth/request-origin"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type WorkspaceActionContext = {
  application: ReturnType<typeof createWorkspaceApplication>
}

type WorkspaceActionContextError = {
  error: "not_authenticated"
}

async function createWorkspaceActionContext(
  options: { withMailer?: boolean } = {}
): Promise<WorkspaceActionContext | WorkspaceActionContextError> {
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
  // Only invite actions need the service-role client and request origin.
  const mailer = options.withMailer
    ? createSupabaseInviteMailer({
        admin: createSupabaseAdminClient(),
        origin: await getRequestOrigin(),
      })
    : undefined
  const application = createWorkspaceApplication({
    actor,
    store,
    activeWorkspaceStore,
    mailer,
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
  ) => Promise<WorkspaceActionResult>,
  options: { withMailer?: boolean } = {}
): Promise<WorkspaceActionResult> {
  const context = await createWorkspaceActionContext(options)
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

export async function acceptWorkspaceInvitationAction(
  invitationId: string,
  profile?: { firstName?: string; lastName?: string }
) {
  return runWorkspaceAction((application) =>
    application.acceptInvitation(invitationId, profile)
  )
}

export async function inviteWorkspaceMemberAction(input: {
  workspaceId: string
  email: string
  role: WorkspaceRole
}) {
  return runWorkspaceAction((application) => application.inviteMember(input), {
    withMailer: true,
  })
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

export async function resendWorkspaceInviteAction(invitationId: string) {
  return runWorkspaceAction(
    (application) => application.resendInvitation(invitationId),
    { withMailer: true }
  )
}

export async function createWorkspaceInviteLinkAction(
  invitationId: string
): Promise<WorkspaceInviteLinkResult> {
  const context = await createWorkspaceActionContext({ withMailer: true })
  if (isWorkspaceActionContextError(context)) return context
  return context.application.createInviteLink(invitationId)
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
