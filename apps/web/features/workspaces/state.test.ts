import { describe, expect, it } from "vitest"

import { createWorkspaceFeatureState } from "@/features/workspaces/state"
import type { Workspace } from "@/features/workspaces/types"

function workspace(patch: Partial<Workspace> = {}): Workspace {
  return {
    id: "team",
    name: "Team",
    handle: "team",
    description: "Team workspace",
    icon: { kind: "mark" },
    accent: "cobalt",
    vertical: "other",
    defaultSenderName: "",
    initialSourceIntent: "skip",
    role: "owner",
    plan: { tier: "Team", price: "$89 / mo", seats: 2 },
    sensitivity: {
      mode: "balanced",
      autoSendThreshold: "low-and-medium",
      manualReviewKeywords: ["refund"],
      excludeFromOutbound: false,
    },
    members: [
      {
        id: "u1",
        name: "Owner",
        email: "owner@example.com",
        role: "owner",
        joinedAt: "Founder",
        lastActiveAt: "Now",
        you: true,
      },
    ],
    invites: [],
    ...patch,
  }
}

describe("workspace state", () => {
  it("creates state with a valid active workspace and falls back on missing active id", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [workspace(), workspace({ id: "other", name: "Other" })],
      joinableWorkspaces: [],
      usageByWorkspaceId: {},
      activeWorkspaceId: "missing",
    })

    expect(initial.activeId).toBe("team")
    expect(initial.active.name).toBe("Team")
  })

  it("exposes active usage separately from workspace identity", () => {
    const state = createWorkspaceFeatureState({
      workspaces: [workspace(), workspace({ id: "other", name: "Other" })],
      joinableWorkspaces: [],
      usageByWorkspaceId: {
        other: {
          counts: { clients: 42, sources: 2, drafts: 7 },
          sidebarCounts: {
            clients: 42,
            tasks: 7,
            march: 10,
            feedback: 3,
            dnc: 1,
          },
        },
      },
      activeWorkspaceId: "other",
    })

    expect(state.activeId).toBe("other")
    expect(state.activeUsage.counts.clients).toBe(42)
    expect(state.activeUsage.sidebarCounts.tasks).toBe(7)
  })

  it("defaults missing active usage to an empty snapshot", () => {
    const state = createWorkspaceFeatureState({
      workspaces: [workspace()],
      joinableWorkspaces: [],
      activeWorkspaceId: "team",
    })

    expect(state.activeUsage.counts).toEqual({
      clients: 0,
      sources: 0,
      drafts: 0,
    })
  })
})
