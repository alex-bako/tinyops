import { describe, expect, it } from "vitest"

import { createWorkspaceApplication } from "@/features/workspaces/application"
import type { ActiveWorkspaceStore } from "@/features/workspaces/active-workspace"
import type { WorkspaceStore } from "@/features/workspaces/use-cases"
import type { Workspace } from "@/features/workspaces/types"

function workspace(id: string, patch: Partial<Workspace> = {}): Workspace {
  return {
    id,
    name: id,
    handle: id,
    description: "",
    icon: { kind: "mark" },
    accent: "cobalt",
    role: "owner",
    plan: { tier: "Team", price: "$0 / alpha", seats: 5 },
    sensitivity: {
      mode: "strict",
      autoSendThreshold: "low-only",
      manualReviewKeywords: [],
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

function harness(initialWorkspaces: Workspace[]) {
  const writes: string[] = []
  const updates: unknown[] = []
  const workspaces = [...initialWorkspaces]
  const activeWorkspaceStore: ActiveWorkspaceStore = {
    async read() {
      return writes.at(-1) ?? null
    },
    async write(id) {
      writes.push(id)
    },
  }
  const store: WorkspaceStore = {
    async listWorkspaces() {
      return workspaces
    },
    async listJoinableWorkspaces() {
      return []
    },
    async createWorkspace(input) {
      const created = workspace("created", {
        name: input.name,
        handle: input.handle,
      })
      workspaces.push(created)
      return created
    },
    async createWorkspaceInvite(input) {
      updates.push(["invite", input])
      return {
        id: "invite_1",
        workspaceId: input.workspaceId,
        email: input.email,
        role: input.role,
      }
    },
    async acceptWorkspaceInvitation() {
      workspaces.push(workspace("accepted"))
      return { workspaceId: "accepted" }
    },
    async archiveWorkspace(workspaceId) {
      updates.push(["archive", workspaceId])
      const index = workspaces.findIndex(
        (candidate) => candidate.id === workspaceId
      )
      if (index >= 0) workspaces.splice(index, 1)
    },
    async updateWorkspaceProfile(input) {
      updates.push(["profile", input])
    },
    async updateWorkspaceSensitivity(input) {
      updates.push(["sensitivity", input])
    },
    async changeMemberRole(input) {
      updates.push(["role", input])
    },
    async removeMember(membershipId) {
      updates.push(["remove", membershipId])
    },
    async revokeWorkspaceInvite(invitationId) {
      updates.push(["revoke", invitationId])
    },
  }

  return {
    app: createWorkspaceApplication({
      actor: session,
      store,
      activeWorkspaceStore,
    }),
    writes,
    updates,
  }
}

const session = {
  userId: "user_1",
  email: "jamie@example.co",
  name: "Jamie",
}

describe("workspace application", () => {
  it("switches active workspace only when visible", async () => {
    const { app, writes } = harness([workspace("one"), workspace("two")])

    await expect(app.switchWorkspace("two")).resolves.toMatchObject({
      data: { activeWorkspaceId: "two" },
    })
    await expect(app.switchWorkspace("missing")).resolves.toMatchObject({
      error: "workspace_not_found",
    })
    expect(writes).toEqual(["two"])
  })

  it("creates workspace and persists the created workspace as active", async () => {
    const { app, writes } = harness([workspace("one")])

    await expect(
      app.createWorkspace({
        name: "Replay Lab",
        handle: "Replay Lab!",
        description: "Course team",
      })
    ).resolves.toMatchObject({
      data: { activeWorkspaceId: "created" },
    })
    expect(writes).toEqual(["created"])
  })

  it("returns domain errors without collapsing everything into action failed", async () => {
    const { app } = harness([workspace("one")])

    await expect(
      app.inviteMember({
        workspaceId: "one",
        email: "jamie@example.co",
        role: "viewer",
      })
    ).resolves.toMatchObject({ error: "duplicate_invite" })
  })
})
