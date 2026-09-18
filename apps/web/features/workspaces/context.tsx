"use client"

import * as React from "react"

import {
  acceptWorkspaceInvitationAction,
  archiveWorkspaceAction,
  changeMemberRoleAction,
  inviteWorkspaceMemberAction,
  removeMemberAction,
  resendWorkspaceInviteAction,
  createWorkspaceInviteLinkAction,
  revokeWorkspaceInviteAction,
  switchWorkspaceAction,
  updateWorkspaceProfileAction,
  updateWorkspaceSensitivityAction,
} from "@/features/workspaces/actions"
import {
  createWorkspaceFeatureState,
  reconcileWorkspaceFeatureState,
  type WorkspaceFeatureState,
} from "@/features/workspaces/state"
import type { WorkspaceProfilePatch } from "@/features/workspaces/use-cases"
import type {
  WorkspaceFeatureData,
  WorkspaceRole,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"

type WorkspaceFeatureCommands = {
  switchWorkspace: (id: string) => void
  updateWorkspaceProfile: (patch: WorkspaceProfilePatch) => void
  inviteMember: (email: string, role: WorkspaceRole) => void
  changeMemberRole: (memberId: string, role: WorkspaceRole) => void
  removeMember: (memberId: string) => void
  acceptInvitation: (invitationId: string) => void
  resendInvitation: (invitationId: string) => void
  copyInviteLink: (invitationId: string) => void
  revokeInvitation: (invitationId: string) => void
  archiveWorkspace: (workspaceId: string) => void
  updateSensitivity: (patch: Partial<WorkspaceSensitivity>) => void
}

// A fresh object per outcome so consumers can react to repeated outcomes.
export type WorkspaceInviteNotice = {
  kind: "sent" | "email_failed" | "link_copied" | "failed"
}

type WorkspaceFeatureContextValue = {
  state: WorkspaceFeatureState
  commands: WorkspaceFeatureCommands
  inviteNotice: WorkspaceInviteNotice | null
}

const WorkspaceFeatureContext =
  React.createContext<WorkspaceFeatureContextValue | null>(null)

export function WorkspaceFeatureProvider({
  data,
  children,
}: {
  data: WorkspaceFeatureData
  children: React.ReactNode
}) {
  const [state, setState] = React.useState<WorkspaceFeatureState>(() =>
    createWorkspaceFeatureState(data)
  )
  const [, startTransition] = React.useTransition()
  const [inviteNotice, setInviteNotice] =
    React.useState<WorkspaceInviteNotice | null>(null)

  // Adopt fresh server data whenever the layout re-renders (navigation or a
  // realtime-driven `router.refresh()`). `data` only gets a new reference from
  // the server, so this never clobbers optimistic updates from local commands.
  React.useEffect(() => {
    setState((prev) => reconcileWorkspaceFeatureState(prev, data))
  }, [data])

  const applyResult = React.useCallback(
    async (
      run: () => Promise<{
        data?: WorkspaceFeatureData
        warning?: string
        error?: string
      }>
    ) => {
      const result = await run()
      if (result.data) {
        setState(createWorkspaceFeatureState(result.data))
      }
      return result
    },
    []
  )

  const commands = React.useMemo<WorkspaceFeatureCommands>(
    () => ({
      switchWorkspace(id) {
        startTransition(() => {
          void applyResult(() => switchWorkspaceAction(id))
        })
      },
      updateWorkspaceProfile(patch) {
        startTransition(() => {
          void applyResult(() =>
            updateWorkspaceProfileAction(state.activeId, patch)
          )
        })
      },
      inviteMember(email, role) {
        startTransition(() => {
          void applyResult(() =>
            inviteWorkspaceMemberAction({
              workspaceId: state.activeId,
              email,
              role,
            })
          ).then(
            (result) =>
              setInviteNotice(
                result.error
                  ? { kind: "failed" }
                  : result.warning
                    ? { kind: "email_failed" }
                    : null
              ),
            () => setInviteNotice({ kind: "failed" })
          )
        })
      },
      changeMemberRole(memberId, role) {
        if (role === "owner") return
        startTransition(() => {
          void applyResult(() => changeMemberRoleAction(memberId, role))
        })
      },
      removeMember(memberId) {
        startTransition(() => {
          void applyResult(() => removeMemberAction(memberId))
        })
      },
      acceptInvitation(invitationId) {
        startTransition(() => {
          void applyResult(() => acceptWorkspaceInvitationAction(invitationId))
        })
      },
      resendInvitation(invitationId) {
        startTransition(() => {
          void applyResult(() =>
            resendWorkspaceInviteAction(invitationId)
          ).then(
            (result) =>
              setInviteNotice({
                kind: result.error
                  ? "failed"
                  : result.warning
                    ? "email_failed"
                    : "sent",
              }),
            () => setInviteNotice({ kind: "failed" })
          )
        })
      },
      copyInviteLink(invitationId) {
        // ponytail: no transition; the link never touches workspace state.
        createWorkspaceInviteLinkAction(invitationId)
          .then(async (result) => {
            if (!result.link) throw new Error(result.error)
            try {
              await navigator.clipboard.writeText(result.link)
              setInviteNotice({ kind: "link_copied" })
            } catch {
              // ponytail: Safari refuses clipboard writes after the server
              // round-trip; a native prompt still lets the admin copy it.
              window.prompt("Copy this invite link:", result.link)
            }
          })
          .catch(() => setInviteNotice({ kind: "failed" }))
      },
      revokeInvitation(invitationId) {
        startTransition(() => {
          void applyResult(() => revokeWorkspaceInviteAction(invitationId))
        })
      },
      archiveWorkspace(workspaceId) {
        startTransition(() => {
          void applyResult(() => archiveWorkspaceAction(workspaceId))
        })
      },
      updateSensitivity(patch) {
        startTransition(() => {
          void applyResult(() =>
            updateWorkspaceSensitivityAction(state.activeId, patch)
          )
        })
      },
    }),
    [applyResult, state.activeId, startTransition]
  )

  const value = React.useMemo<WorkspaceFeatureContextValue>(
    () => ({ state, commands, inviteNotice }),
    [state, commands, inviteNotice]
  )

  return (
    <WorkspaceFeatureContext.Provider value={value}>
      {children}
    </WorkspaceFeatureContext.Provider>
  )
}

export function useWorkspaceFeature(): WorkspaceFeatureContextValue {
  const ctx = React.use(WorkspaceFeatureContext)
  if (!ctx) {
    throw new Error(
      "useWorkspaceFeature must be used within WorkspaceFeatureProvider"
    )
  }
  return ctx
}

export function useActiveWorkspace() {
  return useWorkspaceFeature().state.active
}
