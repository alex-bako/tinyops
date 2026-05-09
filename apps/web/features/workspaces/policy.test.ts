import { describe, expect, it } from "vitest"

import {
  canChangeMemberRole,
  canEditRolePermissions,
  canLeaveWorkspace,
  canManageMembers,
  canRemoveMember,
  canViewBilling,
} from "@/features/workspaces/policy"
import { DEFAULT_PERMISSIONS } from "@/features/workspaces/catalog"
import type { Workspace, WorkspaceMember } from "@/features/workspaces/types"

const member = (patch: Partial<WorkspaceMember> = {}): WorkspaceMember => ({
  id: "u2",
  name: "Devon Nguyen",
  email: "devon@example.com",
  role: "operator",
  joined: "Jan 2026",
  lastActive: "Now",
  ...patch,
})

const workspace = (patch: Partial<Workspace> = {}): Workspace => ({
  id: "team",
  name: "Team",
  handle: "team",
  description: "Team workspace",
  icon: { kind: "mark" },
  accent: "cobalt",
  type: "Team",
  role: "owner",
  plan: { tier: "Team", price: "$89 / mo", seats: 5 },
  counts: { clients: 1, sources: 1, drafts: 1 },
  sidebarCounts: { clients: 1, tasks: 1, march: 1, feedback: 1, dnc: 1 },
  sensitivity: {
    mode: "balanced",
    autoSendThreshold: "low-and-medium",
    manualReviewKeywords: [],
    excludeFromOutbound: false,
  },
  members: [member({ id: "u1", role: "owner", you: true })],
  invites: [],
  permissions: DEFAULT_PERMISSIONS,
  ...patch,
})

describe("workspace policy", () => {
  it("centralizes owner/admin membership and role-permission decisions", () => {
    expect(canManageMembers("owner")).toBe(true)
    expect(canManageMembers("admin")).toBe(true)
    expect(canManageMembers("operator")).toBe(false)
    expect(canEditRolePermissions("owner")).toBe(true)
    expect(canEditRolePermissions("admin")).toBe(true)
    expect(canEditRolePermissions("reviewer")).toBe(false)
  })

  it("keeps billing owner-only", () => {
    expect(canViewBilling("owner")).toBe(true)
    expect(canViewBilling("admin")).toBe(false)
  })

  it("keeps ownership constraints out of UI modules", () => {
    expect(canLeaveWorkspace(workspace({ role: "owner" }))).toBe(false)
    expect(canLeaveWorkspace(workspace({ role: "admin" }))).toBe(true)

    expect(canRemoveMember("owner", member({ role: "owner" }))).toBe(false)
    expect(canRemoveMember("owner", member({ you: true }))).toBe(false)
    expect(canRemoveMember("admin", member({ role: "operator" }))).toBe(true)

    expect(canChangeMemberRole("owner", member({ role: "owner" }))).toBe(false)
    expect(canChangeMemberRole("admin", member({ role: "operator" }))).toBe(true)
    expect(canChangeMemberRole("viewer", member({ role: "operator" }))).toBe(false)
  })
})
