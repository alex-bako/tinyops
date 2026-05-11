import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  activeWorkspaceStore: {
    read: vi.fn(),
    write: vi.fn(),
  },
  createCookieActiveWorkspaceStore: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createSupabaseWorkspaceStore: vi.fn(),
  readSupabaseAppProfileSession: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}))

vi.mock("@/lib/supabase/server", () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}))

vi.mock("@/lib/auth/profile", async () => {
  const actual = await vi.importActual<typeof import("@/lib/auth/profile")>(
    "@/lib/auth/profile"
  )
  return {
    ...actual,
    readSupabaseAppProfileSession: mocks.readSupabaseAppProfileSession,
  }
})

vi.mock("@/features/workspaces/active-workspace-cookie", () => ({
  createCookieActiveWorkspaceStore: mocks.createCookieActiveWorkspaceStore,
}))

vi.mock("@/features/workspaces/supabase-store", () => ({
  createSupabaseWorkspaceStore: mocks.createSupabaseWorkspaceStore,
}))

import { switchWorkspaceAction } from "@/features/workspaces/actions"

describe("workspace server actions", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.createServerSupabaseClient.mockResolvedValue({})
    mocks.readSupabaseAppProfileSession.mockResolvedValue(null)
    mocks.createCookieActiveWorkspaceStore.mockReturnValue(
      mocks.activeWorkspaceStore
    )
    mocks.createSupabaseWorkspaceStore.mockReturnValue({})
  })

  it("returns not_authenticated before creating workspace adapters without a session", async () => {
    await expect(switchWorkspaceAction("workspace_1")).resolves.toEqual({
      error: "not_authenticated",
    })

    expect(mocks.createCookieActiveWorkspaceStore).not.toHaveBeenCalled()
    expect(mocks.createSupabaseWorkspaceStore).not.toHaveBeenCalled()
    expect(mocks.revalidatePath).not.toHaveBeenCalled()
  })
})
