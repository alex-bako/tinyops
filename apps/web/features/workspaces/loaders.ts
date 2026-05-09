import {
  createWorkspaceApplication,
  type WorkspaceApplicationStore,
} from "@/features/workspaces/application"
import type { WorkspaceFeatureData } from "@/features/workspaces/types"
import type { AppProfileSession } from "@/lib/auth/profile"

export async function loadWorkspaceFeatureDataForSession({
  session,
  store,
  activeWorkspaceId,
}: {
  session: AppProfileSession | null
  store: WorkspaceApplicationStore
  activeWorkspaceId?: string | null
}): Promise<WorkspaceFeatureData> {
  const actor = session
    ? {
        userId: session.user.id,
        email: session.email ?? null,
        name: session.email?.split("@")[0] ?? null,
      }
    : null

  const application = createWorkspaceApplication({
    actor,
    store,
    activeWorkspaceStore: {
      async read() {
        return activeWorkspaceId ?? null
      },
      async write() {
        // Layout read path does not mutate cookies. Server actions persist changes.
      },
    },
  })

  return application.loadFeatureData()
}
