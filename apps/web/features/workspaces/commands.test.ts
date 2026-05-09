import { describe, expect, it } from "vitest"

import {
  changeMemberRole,
  createWorkspaceFeatureState,
  inviteMember,
  removeMember,
  switchWorkspace,
  toggleCapability,
  updateSensitivity,
  updateWorkspaceProfile,
} from "@/features/workspaces/commands"
import type {
  CapabilityId,
  Permissions,
  Workspace,
} from "@/features/workspaces/types"

function permissions(): Permissions {
  const ids: CapabilityId[] = [
    "view_clients",
    "edit_clients",
    "create_drafts",
    "send_drafts",
    "approve_sensitive",
    "manage_sources",
    "manage_members",
    "manage_workspace",
    "manage_billing",
    "delete_workspace",
  ]
  const off = Object.fromEntries(ids.map((id) => [id, false])) as Record<
    CapabilityId,
    boolean
  >
  return {
    owner: Object.fromEntries(ids.map((id) => [id, true])) as Record<
      CapabilityId,
      boolean
    >,
    admin: { ...off, manage_members: true },
    operator: { ...off, view_clients: true },
    reviewer: { ...off },
    viewer: { ...off },
  }
}

function workspace(patch: Partial<Workspace> = {}): Workspace {
  return {
    id: "team",
    name: "Team",
    handle: "team",
    description: "Team workspace",
    icon: { kind: "mark" },
    accent: "cobalt",
    type: "Team",
    role: "owner",
    plan: { tier: "Team", price: "$89 / mo", seats: 2 },
    counts: { clients: 1, sources: 1, drafts: 1 },
    sidebarCounts: { clients: 1, tasks: 1, march: 1, feedback: 1, dnc: 1 },
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
        joined: "Founder",
        lastActive: "Now",
        you: true,
      },
    ],
    invites: [],
    permissions: permissions(),
    ...patch,
  }
}

describe("workspace commands", () => {
  it("creates state with a valid active workspace and ignores invalid switches", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [workspace(), workspace({ id: "other", name: "Other" })],
      joinableWorkspaces: [],
      preferredActiveId: "missing",
    })

    expect(initial.activeId).toBe("team")
    expect(switchWorkspace(initial, "other").state.activeId).toBe("other")
    expect(switchWorkspace(initial, "missing")).toMatchObject({
      state: initial,
      error: "workspace_not_found",
    })
  })

  it("updates profile fields without exposing broad partial patches", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [workspace()],
      joinableWorkspaces: [],
    })
    const result = updateWorkspaceProfile(initial, {
      name: "New Team",
      handle: "new-team!",
      description: "Updated",
      accent: "mint",
    })

    expect(result.state.active.name).toBe("New Team")
    expect(result.state.active.handle).toBe("new-team")
    expect(result.state.active.description).toBe("Updated")
    expect(result.state.active.accent).toBe("mint")
  })

  it("validates invites at workspace command seam", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [workspace()],
      joinableWorkspaces: [],
    })

    expect(inviteMember(initial, { email: "bad", role: "operator" }).error).toBe(
      "invalid_email"
    )
    expect(
      inviteMember(initial, { email: "new@example.com", role: "owner" }).error
    ).toBe("owner_invite_forbidden")

    const invited = inviteMember(initial, {
      email: "new@example.com",
      role: "operator",
    }).state
    expect(invited.active.invites).toHaveLength(1)
    expect(
      inviteMember(invited, { email: "new@example.com", role: "viewer" }).error
    ).toBe("duplicate_invite")
    expect(
      inviteMember(invited, { email: "other@example.com", role: "viewer" }).error
    ).toBe("seat_limit_reached")
  })

  it("protects owners and current user during member mutations", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [
        workspace({
          members: [
            ...workspace().members,
            {
              id: "u2",
              name: "Operator",
              email: "operator@example.com",
              role: "operator",
              joined: "Jan",
              lastActive: "Now",
            },
          ],
        }),
      ],
      joinableWorkspaces: [],
    })

    expect(
      changeMemberRole(initial, { memberId: "u1", role: "admin" }).error
    ).toBe("owner_role_locked")
    expect(removeMember(initial, { memberId: "u1" }).error).toBe(
      "member_remove_forbidden"
    )

    const changed = changeMemberRole(initial, {
      memberId: "u2",
      role: "reviewer",
    }).state
    expect(changed.active.members.find((m) => m.id === "u2")?.role).toBe(
      "reviewer"
    )

    const removed = removeMember(changed, { memberId: "u2" }).state
    expect(removed.active.members.find((m) => m.id === "u2")).toBeUndefined()
  })

  it("keeps owner permissions locked while toggling other capabilities", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [workspace()],
      joinableWorkspaces: [],
    })

    expect(
      toggleCapability(initial, { role: "owner", capability: "delete_workspace" })
        .error
    ).toBe("owner_permissions_locked")

    const result = toggleCapability(initial, {
      role: "operator",
      capability: "send_drafts",
    })
    expect(result.state.active.permissions.operator.send_drafts).toBe(true)
  })

  it("updates sensitivity while preserving unrelated fields", () => {
    const initial = createWorkspaceFeatureState({
      workspaces: [workspace()],
      joinableWorkspaces: [],
    })

    const result = updateSensitivity(initial, {
      mode: "strict",
      excludeFromOutbound: true,
    })

    expect(result.state.active.sensitivity).toMatchObject({
      mode: "strict",
      autoSendThreshold: "low-and-medium",
      manualReviewKeywords: ["refund"],
      excludeFromOutbound: true,
    })
  })
})
