import { describe, expect, it } from "vitest"

import { createWorkspaceFeatureState } from "@/features/workspaces/state"
import {
  JOINABLE_WORKSPACES,
  WORKSPACES,
  WORKSPACE_USAGE_BY_ID,
} from "@/features/workspaces/mock-data"
import { WORKSPACE_NAV_GROUPS } from "@/features/workspaces/navigation"
import {
  buildSettingsRailView,
  buildSidebarNavGroups,
  buildWorkspaceSwitcherView,
} from "@/features/workspaces/view-models"

describe("workspace view models", () => {
  it("builds switcher rows without importing mock data in UI modules", async () => {
    const state = createWorkspaceFeatureState({
      workspaces: WORKSPACES,
      joinableWorkspaces: JOINABLE_WORKSPACES,
      usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
      activeWorkspaceId: "course-lab",
    })

    const view = buildWorkspaceSwitcherView(state, {
      filter: "bloom",
      userEmail: "profile@example.co",
      userName: "Jamie Park",
    })

    expect(view.active.name).toBe("Replay Lab")
    expect(view.account.email).toBe("profile@example.co")
    expect(view.switchRows.map((row) => row.name)).toEqual(["Bloom Coaching"])
    expect(view.invitationRows).toHaveLength(0)
  })

  it("builds settings rail by role policy", async () => {
    const state = createWorkspaceFeatureState({
      workspaces: WORKSPACES,
      joinableWorkspaces: [],
      usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
      activeWorkspaceId: "course-lab",
    })

    expect(
      buildSettingsRailView({ active: "general", role: "admin" }).sections.map(
        (section) => section.id
      )
    ).not.toContain("billing")
    expect(
      buildSettingsRailView({ active: "general", role: state.active.role })
        .sections
    ).not.toContainEqual(expect.objectContaining({ id: "billing" }))
  })

  it("hydrates sidebar counts from active workspace", async () => {
    const state = createWorkspaceFeatureState({
      workspaces: WORKSPACES,
      joinableWorkspaces: [],
      usageByWorkspaceId: WORKSPACE_USAGE_BY_ID,
      activeWorkspaceId: "bloom-coaching",
    })

    const groups = buildSidebarNavGroups(
      WORKSPACE_NAV_GROUPS,
      state.activeUsage
    )
    const clients = groups
      .flatMap((group) => group.items)
      .find((item) => item.id === "clients")

    expect(clients?.count).toBe(480)
  })
})
