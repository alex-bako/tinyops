import { describe, expect, it } from "vitest"

import { createWorkspaceApplication } from "@/features/workspaces/application"
import type { ActiveWorkspaceStore } from "@/features/workspaces/active-workspace"
import type { WorkspaceStore } from "@/features/workspaces/use-cases"
import type { Workspace } from "@/features/workspaces/types"
import { deriveWorkspaceHandle } from "@/features/workspaces/handle"
import { HANDLE_TABLE } from "@/features/workspaces/handle-cases"

function workspace(id: string, patch: Partial<Workspace> = {}): Workspace {
  return {
    id,
    name: id,
    handle: id,
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

function harness(
  initialWorkspaces: Workspace[],
  options: {
    acceptError?: string
    mailError?: boolean
    mailThrows?: boolean
    linkError?: boolean
  } = {}
) {
  const writes: string[] = []
  const sent: string[] = []
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
      if (options.acceptError) throw new Error(options.acceptError)
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
    async countWorkspaceClients() {
      return 0
    },
  }

  return {
    app: createWorkspaceApplication({
      actor: session,
      store,
      activeWorkspaceStore,
      mailer: {
        async sendInvite({ email }) {
          // record how many store writes had happened when the mail went out
          sent.push(`${email}@${updates.length}`)
          if (options.mailThrows) throw new Error("boom")
          return { error: options.mailError ? new Error("smtp down") : null }
        },
        async createLink({ email }) {
          if (options.linkError) return { link: null, error: new Error("down") }
          return { link: `https://sb.example.co/link?for=${email}`, error: null }
        },
      },
    }),
    writes,
    updates,
    sent,
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

  it("surfaces invite_not_found from the store when accepting", async () => {
    const { app } = harness([], { acceptError: "invite_not_found" })
    await expect(app.acceptInvitation("invite_1")).resolves.toEqual({
      error: "invite_not_found",
    })

    const other = harness([], { acceptError: "boom" })
    await expect(other.app.acceptInvitation("invite_1")).resolves.toEqual({
      error: "workspace_action_failed",
    })
  })

  it("emails the invitee after saving the invitation", async () => {
    const { app, sent, updates } = harness([workspace("one")])

    await expect(
      app.inviteMember({
        workspaceId: "one",
        email: " VA@Example.co ",
        role: "operator",
      })
    ).resolves.toMatchObject({ data: { activeWorkspaceId: "one" } })
    expect(updates).toHaveLength(1)
    expect(sent).toEqual(["va@example.co@1"])
  })

  it("treats a throwing mailer like a failed send", async () => {
    const { app } = harness([workspace("one")], { mailThrows: true })

    await expect(
      app.inviteMember({
        workspaceId: "one",
        email: "va@example.co",
        role: "operator",
      })
    ).resolves.toMatchObject({
      data: { activeWorkspaceId: "one" },
      warning: "invite_email_failed",
    })
  })

  it("keeps the invitation and warns when the email fails", async () => {
    const { app, updates } = harness([workspace("one")], { mailError: true })

    const result = await app.inviteMember({
      workspaceId: "one",
      email: "va@example.co",
      role: "operator",
    })
    expect(result.warning).toBe("invite_email_failed")
    expect(result.data?.activeWorkspaceId).toBe("one")
    expect(updates).toEqual([
      ["invite", { workspaceId: "one", email: "va@example.co", role: "operator" }],
    ])
  })

  it("resends only pending invitations the actor may manage", async () => {
    const invite = {
      id: "invite_1",
      email: "va@example.co",
      role: "operator" as const,
      createdAt: "2026-09-18T00:00:00.000Z",
      invitedByEmail: "jamie@example.co",
    }
    const owner = harness([workspace("one", { invites: [invite] })])
    await expect(owner.app.resendInvitation("invite_1")).resolves.toMatchObject({
      data: { activeWorkspaceId: "one" },
    })
    expect(owner.sent).toEqual(["va@example.co@0"])

    await expect(owner.app.resendInvitation("missing")).resolves.toEqual({
      error: "invite_not_found",
    })

    const viewer = harness([
      workspace("one", { role: "viewer", invites: [invite] }),
    ])
    await expect(viewer.app.resendInvitation("invite_1")).resolves.toEqual({
      error: "invite_forbidden",
    })
    expect(viewer.sent).toEqual([])

    const failing = harness([workspace("one", { invites: [invite] })], {
      mailError: true,
    })
    await expect(failing.app.resendInvitation("invite_1")).resolves.toMatchObject(
      { warning: "invite_email_failed" }
    )
  })

  it("creates invite links only for pending invitations the actor may manage", async () => {
    const invite = {
      id: "invite_1",
      email: "va@example.co",
      role: "operator" as const,
      createdAt: "2026-09-18T00:00:00.000Z",
      invitedByEmail: "jamie@example.co",
    }
    const owner = harness([workspace("one", { invites: [invite] })])
    await expect(owner.app.createInviteLink("invite_1")).resolves.toEqual({
      link: "https://sb.example.co/link?for=va@example.co",
    })
    expect(owner.updates).toEqual([])

    await expect(owner.app.createInviteLink("missing")).resolves.toEqual({
      error: "invite_not_found",
    })

    const viewer = harness([
      workspace("one", { role: "viewer", invites: [invite] }),
    ])
    await expect(viewer.app.createInviteLink("invite_1")).resolves.toEqual({
      error: "invite_forbidden",
    })

    const failing = harness([workspace("one", { invites: [invite] })], {
      linkError: true,
    })
    await expect(failing.app.createInviteLink("invite_1")).resolves.toEqual({
      error: "invite_link_failed",
    })
  })

  // M3.T5: one rule, one table, no third answer anywhere. Where onboarding rejects, this
  // path now rejects too, instead of storing a short handle for the database to refuse or
  // renaming the workspace to "workspace".
  it.each(HANDLE_TABLE)(
    "derives the same handle as onboarding for $input",
    async ({ input, handle }) => {
      const { app } = harness([workspace("one")])

      const result = await app.createWorkspace({ name: input })

      if (!handle) {
        expect(result).toEqual({
          error: input.trim()
            ? "invalid_workspace_handle"
            : "invalid_workspace_name",
        })
        return
      }

      const created = result.data?.workspaces.find((w) => w.id === "created")
      expect(created?.handle).toBe(handle)
      expect(created?.handle).toBe(deriveWorkspaceHandle(input))
    }
  )
})
