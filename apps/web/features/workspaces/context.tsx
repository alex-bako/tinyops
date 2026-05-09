"use client"

import * as React from "react"

import {
  acceptWorkspaceInvitationAction,
  archiveWorkspaceAction,
  changeMemberRoleAction,
  inviteWorkspaceMemberAction,
  removeMemberAction,
  revokeWorkspaceInviteAction,
  switchWorkspaceAction,
  updateWorkspaceProfileAction,
  updateWorkspaceSensitivityAction,
} from "@/features/workspaces/actions"
import {
  createWorkspaceFeatureState,
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
  revokeInvitation: (invitationId: string) => void
  archiveWorkspace: (workspaceId: string) => void
  updateSensitivity: (patch: Partial<WorkspaceSensitivity>) => void
}

type WorkspaceFeatureContextValue = {
  state: WorkspaceFeatureState
  commands: WorkspaceFeatureCommands
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

  const applyResult = React.useCallback(
    async (
      run: () => Promise<{
        data?: WorkspaceFeatureData
        error?: string
      }>
    ) => {
      const result = await run()
      if (result.data) {
        setState(createWorkspaceFeatureState(result.data))
      }
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
    () => ({ state, commands }),
    [state, commands]
  )

  return (
    <WorkspaceFeatureContext.Provider value={value}>
      {children}
    </WorkspaceFeatureContext.Provider>
  )
}

export function useWorkspaceFeature(): WorkspaceFeatureContextValue {
  const ctx = React.useContext(WorkspaceFeatureContext)
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
