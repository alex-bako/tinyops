import { describe, expect, it, vi } from "vitest"

import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"
import type { Workspace } from "@/features/workspaces/types"

const workspace = {
  id: "workspace_1",
  name: "Practice",
  handle: "practice",
  description: "",
  icon: { kind: "mark" },
  accent: "cobalt",
  vertical: "other",
  defaultSenderName: "",
  initialSourceIntent: "skip",
  role: "owner",
  plan: { tier: "Team", price: "$0 / alpha", seats: 5 },
  sensitivity: {
    mode: "strict",
    autoSendThreshold: "low-only",
    manualReviewKeywords: [],
    excludeFromOutbound: true,
  },
  members: [],
  invites: [],
} satisfies Workspace

describe("workspace request context", () => {
  it("loads session, active workspace, and feature stores through one seam", async () => {
    const session = {
      user: { id: "user_1", email: "user@example.com" },
      profile: {
        id: "user_1",
        email: "user@example.com",
        firstName: "Jamie",
        lastName: "Park",
        onboardedAt: "2026-05-10T01:02:03.000Z",
      },
      email: "user@example.com",
    }
    const supabase = {}
    const workspaceStore = {}
    const dataSourceStore = {}
    const activeWorkspaceStore = {
      read: vi.fn().mockResolvedValue("workspace_1"),
    }
    const workspaceFeatureData = {
      workspaces: [workspace],
      joinableWorkspaces: [],
      usageByWorkspaceId: {},
      activeWorkspaceId: "workspace_1",
    }

    await expect(
      createWorkspaceRequestContext({
        supabaseFactory: async () => supabase as never,
        sessionReader: async () => session,
        activeWorkspaceStoreFactory: () => activeWorkspaceStore,
        workspaceStoreFactory: () => workspaceStore as never,
        dataSourceStoreFactory: () => dataSourceStore as never,
        workspaceFeatureLoader: async () => workspaceFeatureData,
      })
    ).resolves.toEqual({
      supabase,
      session,
      activeWorkspace: workspace,
      workspaceFeatureData,
      workspaceStore,
      dataSourceStore,
    })
  })

  it("returns null when no app profile session exists", async () => {
    await expect(
      createWorkspaceRequestContext({
        supabaseFactory: async () => ({}) as never,
        sessionReader: async () => null,
      })
    ).resolves.toBeNull()
  })
})
