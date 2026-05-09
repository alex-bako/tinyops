import { createCookieActiveWorkspaceStore } from "@/features/workspaces/active-workspace-cookie"
import { loadWorkspaceFeatureDataForSession } from "@/features/workspaces/loaders"
import {
  createSupabaseWorkspaceStore,
  type SupabaseWorkspaceStore,
} from "@/features/workspaces/supabase-store"
import type {
  Workspace,
  WorkspaceFeatureData,
} from "@/features/workspaces/types"
import { createSupabaseDataSourceStore } from "@/features/data-sources/supabase-store"
import type { DataSourceStore } from "@/features/data-sources/types"
import type { AppProfileSession } from "@/lib/auth/profile"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

type SupabaseServerClient = Awaited<ReturnType<typeof createServerSupabaseClient>>

type ActiveWorkspaceStore = {
  read(): Promise<string | null>
}

type WorkspaceRequestContextDependencies = {
  supabaseFactory?: () => Promise<SupabaseServerClient>
  sessionReader?: (
    client: SupabaseServerClient
  ) => Promise<AppProfileSession | null>
  activeWorkspaceStoreFactory?: () => ActiveWorkspaceStore
  workspaceStoreFactory?: (input: {
    client: SupabaseServerClient
    actorUserId: string
  }) => SupabaseWorkspaceStore
  dataSourceStoreFactory?: (input: {
    client: SupabaseServerClient
  }) => DataSourceStore
  workspaceFeatureLoader?: (input: {
    session: AppProfileSession
    store: SupabaseWorkspaceStore
    activeWorkspaceId: string | null
  }) => Promise<WorkspaceFeatureData>
}

export type WorkspaceRequestContext = {
  supabase: SupabaseServerClient
  session: AppProfileSession
  workspaceFeatureData: WorkspaceFeatureData
  activeWorkspace: Workspace
  workspaceStore: SupabaseWorkspaceStore
  dataSourceStore: DataSourceStore
}

export async function createWorkspaceRequestContext({
  supabaseFactory = createServerSupabaseClient,
  sessionReader = readSupabaseAppProfileSession,
  activeWorkspaceStoreFactory = createCookieActiveWorkspaceStore,
  workspaceStoreFactory = ({ client, actorUserId }) =>
    createSupabaseWorkspaceStore({ client, actorUserId }),
  dataSourceStoreFactory = ({ client }) =>
    createSupabaseDataSourceStore({ client }),
  workspaceFeatureLoader = loadWorkspaceFeatureDataForSession,
}: WorkspaceRequestContextDependencies = {}): Promise<WorkspaceRequestContext | null> {
  const supabase = await supabaseFactory()
  const session = await sessionReader(supabase)
  if (!session) return null

  const activeWorkspaceStore = activeWorkspaceStoreFactory()
  const activeWorkspaceId = await activeWorkspaceStore.read()
  const workspaceStore = workspaceStoreFactory({
    client: supabase,
    actorUserId: session.user.id,
  })
  const workspaceFeatureData = await workspaceFeatureLoader({
    session,
    store: workspaceStore,
    activeWorkspaceId,
  })
  const activeWorkspace =
    workspaceFeatureData.workspaces.find(
      (candidate) => candidate.id === workspaceFeatureData.activeWorkspaceId
    ) ?? workspaceFeatureData.workspaces[0]

  if (!activeWorkspace) return null

  return {
    supabase,
    session,
    workspaceFeatureData,
    activeWorkspace,
    workspaceStore,
    dataSourceStore: dataSourceStoreFactory({ client: supabase }),
  }
}
