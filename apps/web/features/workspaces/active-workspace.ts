import type { Workspace } from "@/features/workspaces/types"

export const ACTIVE_WORKSPACE_COOKIE = "tinyops:active-workspace-id"

export type ActiveWorkspaceStore = {
  read(): Promise<string | null>
  write(id: string): Promise<void>
}

export function resolveActiveWorkspaceId(
  workspaces: Pick<Workspace, "id">[],
  requestedId: string | null | undefined
): string | null {
  if (workspaces.some((workspace) => workspace.id === requestedId)) {
    return requestedId!
  }

  return workspaces[0]?.id ?? null
}
