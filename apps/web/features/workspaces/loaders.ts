import { mockWorkspaceRepository } from "@/features/workspaces/mock-repository"
import type {
  WorkspaceFeatureData,
  WorkspaceRepository,
} from "@/features/workspaces/repository"

export function getWorkspaceRepository(): WorkspaceRepository {
  return mockWorkspaceRepository
}

export async function loadWorkspaceFeatureData(
  repository: WorkspaceRepository = getWorkspaceRepository()
): Promise<WorkspaceFeatureData> {
  const [workspaces, joinableWorkspaces] = await Promise.all([
    repository.listWorkspaces(),
    repository.listJoinableWorkspaces(),
  ])

  return { workspaces, joinableWorkspaces }
}
