import type {
  JoinableWorkspace,
  Workspace,
} from "@/features/workspaces/types"

export type WorkspaceRepository = {
  listWorkspaces(): Promise<Workspace[]>
  listJoinableWorkspaces(): Promise<JoinableWorkspace[]>
  findWorkspaceById(id: string): Promise<Workspace | null>
  updateWorkspace(workspace: Workspace): Promise<Workspace>
}

export type WorkspaceFeatureData = {
  workspaces: Workspace[]
  joinableWorkspaces: JoinableWorkspace[]
}
