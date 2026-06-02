import { describe, expect, it } from "vitest"

import {
  acceptWorkspaceInvitationForUser,
  archiveWorkspaceForUser,
  changeWorkspaceMemberRoleForUser,
  ensureWorkspaceFeatureData,
  inviteWorkspaceMember,
  removeWorkspaceMemberForUser,
  revokeWorkspaceInvitationForUser,
  updateWorkspaceProfileForUser,
  updateWorkspaceSensitivityForUser,
} from "@/features/workspaces/use-cases"
import type {
  WorkspaceInviteRecord,
  WorkspaceStore,
} from "@/features/workspaces/use-cases"
import type { Workspace, WorkspaceRole } from "@/features/workspaces/types"

function workspace(patch: Partial<Workspace> = {}): Workspace {
  return {
    id: "workspace_1",
    name: "Jamie Practice",
    handle: "jamie-practice",
    description: "Private practice",
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
      manualReviewKeywords: ["crisis", "trauma"],
      excludeFromOutbound: true,
    },
    members: [
      {
        id: "member_1",
        name: "Jamie",
        email: "jamie@example.co",
        role: "owner",
        joinedAt: "Now",
        lastActiveAt: "Now",
        you: true,
      },
    ],
    invites: [],
    ...patch,
  }
}

function store({
  workspaces = [],
  invitations = [],
  clientCounts = {},
}: {
  workspaces?: Workspace[]
  invitations?: WorkspaceInviteRecord[]
  clientCounts?: Record<string, number>
} = {}): WorkspaceStore & {
  created: Workspace[]
  archived: string[]
  updates: unknown[]
  workspaceInvites: WorkspaceInviteRecord[]
  countedWorkspaceIds: string[]
} {
  const calls = {
    created: [] as Workspace[],
    archived: [] as string[],
    updates: [] as unknown[],
    workspaceInvites: [...invitations],
    countedWorkspaceIds: [] as string[],
  }

  return {
    ...calls,
    async listWorkspaces() {
      return workspaces.filter(
        (candidate) => !calls.archived.includes(candidate.id)
      )
    },
    async listJoinableWorkspaces() {
      return []
    },
    async createWorkspace(input) {
      const created = workspace({
        id: "workspace_created",
        name: input.name,
        handle: input.handle,
      })
      calls.created.push(created)
      workspaces.push(created)
      return created
    },
    async createWorkspaceInvite(input) {
      const invite = {
        id: "invite_1",
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
      }
      calls.workspaceInvites.push(invite)
      return invite
    },
    async archiveWorkspace(workspaceId) {
      calls.archived.push(workspaceId)
    },
    async updateWorkspaceProfile(input) {
      calls.updates.push(["profile", input])
    },
    async updateWorkspaceSensitivity(input) {
      calls.updates.push(["sensitivity", input])
    },
    async changeMemberRole(input) {
      calls.updates.push(["role", input])
    },
    async removeMember(membershipId) {
      calls.updates.push(["remove", membershipId])
    },
    async revokeWorkspaceInvite(invitationId) {
      calls.updates.push(["revoke", invitationId])
    },
    async countWorkspaceClients(workspaceId) {
      calls.countedWorkspaceIds.push(workspaceId)
      return clientCounts[workspaceId] ?? 0
    },
    async acceptWorkspaceInvitation(input) {
      const invite = calls.workspaceInvites.find(
        (candidate) => candidate.id === input.invitationId
      )
      if (!invite) throw new Error("invite_not_found")
      workspaces.push(
        workspace({
          id: invite.workspaceId,
          name: "Accepted",
          role: invite.role,
          members: [
            {
              id: "member_accepted",
              name: "Jamie",
              email: input.email,
              role: invite.role,
              joinedAt: "Now",
              lastActiveAt: "Now",
              you: true,
            },
          ],
        })
      )
      return { workspaceId: invite.workspaceId }
    },
  }
}

describe("workspace use cases", () => {
  it("does not auto-create a personal workspace when user has none", async () => {
    const fakeStore = store()

    const data = await ensureWorkspaceFeatureData(
      {
        userId: "user_1",
        email: " Jamie@Example.Co ",
        name: "Jamie Park",
        activeWorkspaceId: null,
      },
      fakeStore
    )

    expect(fakeStore.created).toHaveLength(0)
    expect(data.workspaces).toHaveLength(0)
    expect(data.activeWorkspaceId).toBeNull()
  })

  it("falls back to first visible workspace when preferred active id is invalid", async () => {
    const fakeStore = store({
      workspaces: [
        workspace({ id: "workspace_1", name: "One" }),
        workspace({ id: "workspace_2", name: "Two" }),
      ],
    })

    const data = await ensureWorkspaceFeatureData(
      {
        userId: "user_1",
        email: "jamie@example.co",
        name: "Jamie",
        activeWorkspaceId: "missing",
      },
      fakeStore
    )

    expect(data.activeWorkspaceId).toBe("workspace_1")
  })

  it("populates the active workspace client count from the store", async () => {
    const fakeStore = store({
      workspaces: [
        workspace({ id: "workspace_1", name: "One" }),
        workspace({ id: "workspace_2", name: "Two" }),
      ],
      clientCounts: { workspace_1: 142, workspace_2: 7 },
    })

    const data = await ensureWorkspaceFeatureData(
      {
        userId: "user_1",
        email: "jamie@example.co",
        name: "Jamie",
        activeWorkspaceId: "workspace_1",
      },
      fakeStore
    )

    expect(data.usageByWorkspaceId.workspace_1?.counts.clients).toBe(142)
    expect(data.usageByWorkspaceId.workspace_1?.sidebarCounts.clients).toBe(142)
    // Only the active workspace is counted.
    expect(fakeStore.countedWorkspaceIds).toEqual(["workspace_1"])
    expect(data.usageByWorkspaceId.workspace_2?.sidebarCounts.clients).toBe(0)
  })

  it("skips counting clients when there is no active workspace", async () => {
    const fakeStore = store()

    const data = await ensureWorkspaceFeatureData(
      {
        userId: "user_1",
        email: "jamie@example.co",
        name: "Jamie",
        activeWorkspaceId: null,
      },
      fakeStore
    )

    expect(fakeStore.countedWorkspaceIds).toEqual([])
    expect(data.usageByWorkspaceId).toEqual({})
  })

  it("creates workspace invite through workspace store", async () => {
    const fakeStore = store({
      workspaces: [workspace()],
    })

    await inviteWorkspaceMember(
      {
        workspace: workspace(),
        email: " New.Member@Example.Co ",
        role: "operator",
      },
      fakeStore
    )

    expect(fakeStore.workspaceInvites).toMatchObject([
      {
        workspaceId: "workspace_1",
        email: "new.member@example.co",
        role: "operator" satisfies WorkspaceRole,
      },
    ])
  })

  it("archives owner workspace and removes it from next visible data", async () => {
    const fakeStore = store({
      workspaces: [
        workspace({ id: "workspace_1" }),
        workspace({ id: "workspace_2" }),
      ],
    })

    const data = await archiveWorkspaceForUser(
      {
        actorUserId: "user_1",
        workspace: workspace({ id: "workspace_1", role: "owner" }),
        email: "jamie@example.co",
        name: "Jamie",
      },
      fakeStore
    )

    expect(fakeStore.archived).toEqual(["workspace_1"])
    expect(data.workspaces.map((candidate) => candidate.id)).toEqual([
      "workspace_2",
    ])
    expect(data.activeWorkspaceId).toBe("workspace_2")
  })

  it("accepts a pending invite and makes that workspace active", async () => {
    const fakeStore = store({
      workspaces: [workspace({ id: "existing" })],
      invitations: [
        {
          id: "invite_1",
          workspaceId: "joined",
          email: "jamie@example.co",
          role: "admin",
        },
      ],
    })

    const data = await acceptWorkspaceInvitationForUser(
      {
        invitationId: "invite_1",
        userId: "user_1",
        email: "jamie@example.co",
        name: "Jamie",
      },
      fakeStore
    )

    expect(data.activeWorkspaceId).toBe("joined")
    expect(data.workspaces.map((candidate) => candidate.id)).toContain("joined")
  })

  it("rejects duplicate workspace invites before touching the store", async () => {
    const fakeStore = store()
    const current = workspace({
      plan: { tier: "Team", price: "$0 / alpha", seats: 4 },
      members: [
        ...workspace().members,
        {
          id: "member_2",
          name: "Devon",
          email: "devon@example.co",
          role: "operator",
          joinedAt: "Now",
          lastActiveAt: "Now",
        },
      ],
      invites: [
        {
          id: "invite_1",
          email: "pending@example.co",
          role: "viewer",
          createdAt: "2026-05-09T00:00:00.000Z",
          invitedByEmail: "jamie@example.co",
        },
      ],
    })

    await expect(
      inviteWorkspaceMember(
        {
          workspace: current,
          email: "devon@example.co",
          role: "operator",
        },
        fakeStore
      )
    ).rejects.toThrow("duplicate_invite")
    await expect(
      inviteWorkspaceMember(
        {
          workspace: current,
          email: "pending@example.co",
          role: "operator",
        },
        fakeStore
      )
    ).rejects.toThrow("duplicate_invite")
    expect(fakeStore.workspaceInvites).toHaveLength(0)
  })

  it("validates profile and sensitivity updates at the domain seam", async () => {
    const fakeStore = store()
    const current = workspace()

    await expect(
      updateWorkspaceProfileForUser(
        { workspace: current, patch: { name: "   " } },
        fakeStore
      )
    ).rejects.toThrow("invalid_workspace_name")

    await updateWorkspaceProfileForUser(
      {
        workspace: current,
        patch: { name: " New Name ", handle: "New Name!" },
      },
      fakeStore
    )
    await updateWorkspaceSensitivityForUser(
      {
        workspace: current,
        sensitivity: { manualReviewKeywords: [" crisis ", "", "Trauma"] },
      },
      fakeStore
    )

    expect(fakeStore.updates).toEqual([
      [
        "profile",
        { workspaceId: "workspace_1", name: "New Name", handle: "new-name" },
      ],
      [
        "sensitivity",
        {
          workspaceId: "workspace_1",
          sensitivity: { manualReviewKeywords: ["crisis", "trauma"] },
        },
      ],
    ])
  })

  it("protects member role changes and removals at the domain seam", async () => {
    const fakeStore = store()
    const current = workspace({
      members: [
        ...workspace().members,
        {
          id: "member_2",
          name: "Devon",
          email: "devon@example.co",
          role: "operator",
          joinedAt: "Now",
          lastActiveAt: "Now",
        },
      ],
    })

    await expect(
      changeWorkspaceMemberRoleForUser(
        { workspace: current, membershipId: "member_1", role: "admin" },
        fakeStore
      )
    ).rejects.toThrow("owner_role_locked")
    await expect(
      removeWorkspaceMemberForUser(
        { workspace: current, membershipId: "member_1" },
        fakeStore
      )
    ).rejects.toThrow("member_remove_forbidden")

    await changeWorkspaceMemberRoleForUser(
      { workspace: current, membershipId: "member_2", role: "reviewer" },
      fakeStore
    )
    await removeWorkspaceMemberForUser(
      { workspace: current, membershipId: "member_2" },
      fakeStore
    )

    expect(fakeStore.updates).toEqual([
      ["role", { membershipId: "member_2", role: "reviewer" }],
      ["remove", "member_2"],
    ])
  })

  it("protects invite revocation at the domain seam", async () => {
    const fakeStore = store()
    const current = workspace({
      role: "viewer",
      invites: [
        {
          id: "invite_1",
          email: "new@example.co",
          role: "viewer",
          createdAt: "2026-05-09T00:00:00.000Z",
          invitedByEmail: "jamie@example.co",
        },
      ],
    })

    await expect(
      revokeWorkspaceInvitationForUser(
        { workspace: current, invitationId: "invite_1" },
        fakeStore
      )
    ).rejects.toThrow("invite_revoke_forbidden")
    expect(fakeStore.updates).toEqual([])
  })
})
