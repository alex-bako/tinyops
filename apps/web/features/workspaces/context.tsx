"use client"

import * as React from "react"

import {
  changeMemberRole,
  createWorkspaceFeatureState,
  inviteMember,
  removeMember,
  switchWorkspace,
  toggleCapability,
  updateSensitivity,
  updateWorkspaceProfile,
  type WorkspaceFeatureState,
  type WorkspaceProfilePatch,
} from "@/features/workspaces/commands"
import type { WorkspaceFeatureData } from "@/features/workspaces/repository"
import type {
  CapabilityId,
  WorkspaceRole,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"

const STORAGE_KEY = "tinyops:active-workspace"

type WorkspaceFeatureCommands = {
  switchWorkspace: (id: string) => void
  updateWorkspaceProfile: (patch: WorkspaceProfilePatch) => void
  inviteMember: (email: string, role: WorkspaceRole) => void
  changeMemberRole: (memberId: string, role: WorkspaceRole) => void
  removeMember: (memberId: string) => void
  toggleCapability: (role: WorkspaceRole, capability: CapabilityId) => void
  updateSensitivity: (patch: Partial<WorkspaceSensitivity>) => void
}

type WorkspaceFeatureContextValue = {
  state: WorkspaceFeatureState
  commands: WorkspaceFeatureCommands
}

const WorkspaceFeatureContext =
  React.createContext<WorkspaceFeatureContextValue | null>(null)

function readStoredId(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStoredId(id: string) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

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

  React.useEffect(() => {
    const stored = readStoredId()
    if (!stored) return
    setState((current) => switchWorkspace(current, stored).state)
  }, [])

  const commands = React.useMemo<WorkspaceFeatureCommands>(
    () => ({
      switchWorkspace(id) {
        setState((current) => {
          const result = switchWorkspace(current, id)
          if (!result.error) writeStoredId(result.state.activeId)
          return result.state
        })
      },
      updateWorkspaceProfile(patch) {
        setState((current) => updateWorkspaceProfile(current, patch).state)
      },
      inviteMember(email, role) {
        setState((current) => inviteMember(current, { email, role }).state)
      },
      changeMemberRole(memberId, role) {
        setState(
          (current) => changeMemberRole(current, { memberId, role }).state
        )
      },
      removeMember(memberId) {
        setState((current) => removeMember(current, { memberId }).state)
      },
      toggleCapability(role, capability) {
        setState(
          (current) => toggleCapability(current, { role, capability }).state
        )
      },
      updateSensitivity(patch) {
        setState((current) => updateSensitivity(current, patch).state)
      },
    }),
    []
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
