import { describe, expect, it } from "vitest"

import {
  mapWorkspaceInvitationRow,
  mapWorkspaceRow,
} from "@/features/workspaces/mappers"

describe("workspace mappers", () => {
  it("maps Supabase workspace rows into UI workspace models", () => {
    const workspace = mapWorkspaceRow(
      {
        id: "workspace_1",
        name: "Jamie Practice",
        handle: "jamie-practice",
        description: "Private practice",
        icon_kind: "letter",
        icon_letter: "J",
        icon_tone: "mint",
        accent: "cobalt",
        plan_tier: "Team",
        plan_price: "$0 / alpha",
        plan_seats: 5,
        sensitivity_mode: "strict",
        auto_send_threshold: "low-only",
        manual_review_keywords: ["crisis"],
        exclude_from_outbound: true,
        workspace_memberships: [
          {
            id: "member_1",
            user_id: "user_1",
            role: "owner",
            joined_at: "2026-05-09T00:00:00.000Z",
            last_active_at: null,
            profiles: { email: "jamie@example.co" },
          },
          {
            id: "member_2",
            user_id: "user_2",
            role: "operator",
            joined_at: "2026-05-09T00:00:00.000Z",
            last_active_at: null,
            profiles: { email: "devon@example.co" },
          },
        ],
        workspace_invitations: [
          {
            id: "invite_1",
            email: "new@example.co",
            role: "viewer",
            created_at: "2026-05-09T00:00:00.000Z",
            accepted_at: null,
            revoked_at: null,
            profiles: { email: "jamie@example.co" },
          },
        ],
      },
      { userId: "user_1" }
    )

    expect(workspace).toMatchObject({
      id: "workspace_1",
      name: "Jamie Practice",
      handle: "jamie-practice",
      icon: { kind: "letter", letter: "J", tone: "mint" },
      accent: "cobalt",
      role: "owner",
      plan: { tier: "Team", price: "$0 / alpha", seats: 5 },
      sensitivity: {
        mode: "strict",
        autoSendThreshold: "low-only",
        manualReviewKeywords: ["crisis"],
        excludeFromOutbound: true,
      },
    })
    expect(workspace.members).toMatchObject([
      {
        id: "member_1",
        name: "jamie",
        email: "jamie@example.co",
        role: "owner",
        joinedAt: "2026-05-09T00:00:00.000Z",
        lastActiveAt: null,
        you: true,
      },
      {
        id: "member_2",
        name: "devon",
        email: "devon@example.co",
        role: "operator",
        joinedAt: "2026-05-09T00:00:00.000Z",
        lastActiveAt: null,
      },
    ])
    expect(workspace.invites).toMatchObject([
      {
        id: "invite_1",
        email: "new@example.co",
        role: "viewer",
        createdAt: "2026-05-09T00:00:00.000Z",
        invitedByEmail: "jamie@example.co",
      },
    ])
  })

  it("maps pending invitation rows into joinable workspace rows", () => {
    const invitation = mapWorkspaceInvitationRow({
      id: "invite_1",
      workspace_id: "workspace_1",
      email: "jamie@example.co",
      role: "admin",
      created_at: "2026-05-09T00:00:00.000Z",
      workspaces: {
        id: "workspace_1",
        name: "Replay Lab",
        handle: "replay-lab",
        icon_kind: "mark",
        icon_letter: null,
        icon_tone: "cobalt",
        workspace_memberships: [{ id: "member_1" }, { id: "member_2" }],
      },
      profiles: { email: "owner@example.co" },
    })

    expect(invitation).toEqual({
      invitationId: "invite_1",
      workspaceId: "workspace_1",
      name: "Replay Lab",
      handle: "replay-lab",
      icon: { kind: "mark" },
      members: 2,
      role: "admin",
      invitedByEmail: "owner@example.co",
    })
  })
})
