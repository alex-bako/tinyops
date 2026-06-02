import type {
  JoinableWorkspace,
  Workspace,
  WorkspaceFeatureData,
  WorkspaceUsageSnapshot,
} from "@/features/workspaces/types"
import { EMPTY_WORKSPACE_USAGE } from "@/features/workspaces/types"

export type WorkspaceFeatureState = {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  usageByWorkspaceId: Record<string, WorkspaceUsageSnapshot>
  activeId: string
  active: Workspace
  activeUsage: WorkspaceUsageSnapshot
}

export function createWorkspaceFeatureState({
  workspaces,
  joinableWorkspaces,
  usageByWorkspaceId,
  activeWorkspaceId,
}: {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  usageByWorkspaceId?: Record<string, WorkspaceUsageSnapshot>
  activeWorkspaceId?: string | null
}): WorkspaceFeatureState {
  if (workspaces.length === 0) {
    throw new Error("WorkspaceFeatureState requires at least one workspace")
  }

  const activeId = workspaces.some(
    (workspace) => workspace.id === activeWorkspaceId
  )
    ? activeWorkspaceId!
    : workspaces[0]!.id

  return withActive({
    workspaces,
    joinableWorkspaces,
    usageByWorkspaceId: usageByWorkspaceId ?? {},
    activeId,
  })
}

/**
 * Re-derive feature state from fresh server `data` (e.g. after
 * `router.refresh()`), while preserving the user's currently selected workspace
 * when it still exists. This lets background server refreshes update derived
 * values such as the sidebar client count without resetting the active tab.
 */
export function reconcileWorkspaceFeatureState(
  prev: WorkspaceFeatureState,
  data: WorkspaceFeatureData
): WorkspaceFeatureState {
  const activeWorkspaceId = data.workspaces.some(
    (workspace) => workspace.id === prev.activeId
  )
    ? prev.activeId
    : data.activeWorkspaceId

  return createWorkspaceFeatureState({
    workspaces: data.workspaces,
    joinableWorkspaces: data.joinableWorkspaces,
    usageByWorkspaceId: data.usageByWorkspaceId,
    activeWorkspaceId,
  })
}

function withActive({
  workspaces,
  joinableWorkspaces,
  usageByWorkspaceId,
  activeId,
}: {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
  usageByWorkspaceId: Record<string, WorkspaceUsageSnapshot>
  activeId: string
}): WorkspaceFeatureState {
  const active =
    workspaces.find((workspace) => workspace.id === activeId) ?? workspaces[0]!
  const activeUsage = usageByWorkspaceId[active.id] ?? EMPTY_WORKSPACE_USAGE

  return {
    workspaces,
    joinableWorkspaces,
    usageByWorkspaceId,
    activeId: active.id,
    active,
    activeUsage,
  }
}
