import {
  JOINABLE_WORKSPACES,
  WORKSPACES,
} from "@/features/workspaces/mock-data"
import type { WorkspaceRepository } from "@/features/workspaces/repository"
import type {
  JoinableWorkspace,
  Workspace,
} from "@/features/workspaces/types"

type MockWorkspaceRepositoryOptions = {
  workspaces?: Workspace[]
  joinableWorkspaces?: JoinableWorkspace[]
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

export function createMockWorkspaceRepository({
  workspaces = WORKSPACES,
  joinableWorkspaces = JOINABLE_WORKSPACES,
}: MockWorkspaceRepositoryOptions = {}): WorkspaceRepository {
  let storage = clone(workspaces)

  return {
    async listWorkspaces() {
      return clone(storage)
    },
    async listJoinableWorkspaces() {
      return clone(joinableWorkspaces)
    },
    async findWorkspaceById(id) {
      return clone(storage.find((workspace) => workspace.id === id) ?? null)
    },
    async updateWorkspace(workspace) {
      const next = clone(workspace)
      storage = storage.map((candidate) =>
        candidate.id === next.id ? next : candidate
      )
      return clone(next)
    },
  }
}

export const mockWorkspaceRepository = createMockWorkspaceRepository()
