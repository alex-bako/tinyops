import * as React from "react"
import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Workspace } from "@/features/workspaces/types"

import { SectionMembers } from "./section-members"

function workspace(role: Workspace["role"]): Workspace {
  return {
    id: "ws_1",
    name: "Park Therapy",
    handle: "park-therapy",
    description: "",
    icon: { kind: "mark" },
    accent: "cobalt",
    vertical: "therapy",
    defaultSenderName: "",
    initialSourceIntent: "skip",
    role,
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
        you: role === "owner",
      },
    ],
    invites: [
      {
        id: "invite_1",
        email: "va@example.co",
        role: "operator",
        createdAt: "2026-09-18T00:00:00.000Z",
        invitedByEmail: "jamie@example.co",
      },
    ],
  }
}

function renderMembers(
  props: Partial<React.ComponentProps<typeof SectionMembers>> = {}
) {
  const onResendInvite = vi.fn()
  const onCopyInviteLink = vi.fn()
  render(
    <SectionMembers
      workspace={workspace("owner")}
      onInvite={vi.fn()}
      onChangeRole={vi.fn()}
      onRemoveMember={vi.fn()}
      onResendInvite={onResendInvite}
      onCopyInviteLink={onCopyInviteLink}
      onRevokeInvite={vi.fn()}
      {...props}
    />
  )
}

describe("SectionMembers invites", () => {
  it("resends a pending invitation and locks the button until the answer", () => {
    const onResendInvite = vi.fn()
    const { rerender } = render(
      <SectionMembers
        workspace={workspace("owner")}
        onInvite={vi.fn()}
        onChangeRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={onResendInvite}
        onCopyInviteLink={vi.fn()}
        onRevokeInvite={vi.fn()}
        inviteNotice={null}
      />
    )

    const resend = screen.getByRole("button", { name: /resend/i })
    fireEvent.click(resend)
    expect(onResendInvite).toHaveBeenCalledWith("invite_1")
    expect(resend).toBeDisabled()

    rerender(
      <SectionMembers
        workspace={workspace("owner")}
        onInvite={vi.fn()}
        onChangeRole={vi.fn()}
        onRemoveMember={vi.fn()}
        onResendInvite={onResendInvite}
        onCopyInviteLink={vi.fn()}
        onRevokeInvite={vi.fn()}
        inviteNotice={{ kind: "failed" }}
      />
    )
    expect(screen.getByRole("button", { name: /resend/i })).toBeEnabled()
    expect(screen.getByRole("status")).toHaveTextContent("Something went wrong")
  })

  it("tells the inviter when the invite was saved but the email failed", () => {
    renderMembers({ inviteNotice: { kind: "email_failed" } })

    expect(screen.getByRole("status")).toHaveTextContent(
      "Invite saved, email not sent."
    )
  })

  it("copies an invite link and confirms it", () => {
    const onCopyInviteLink = vi.fn()
    renderMembers({ onCopyInviteLink, inviteNotice: { kind: "link_copied" } })

    fireEvent.click(screen.getByRole("button", { name: /copy link/i }))
    expect(onCopyInviteLink).toHaveBeenCalledWith("invite_1")
    expect(screen.getByRole("status")).toHaveTextContent("Invite link copied.")
  })

  it("shows the notice even without pending invites", () => {
    renderMembers({
      workspace: { ...workspace("owner"), invites: [] },
      inviteNotice: { kind: "failed" },
    })

    expect(screen.getByRole("status")).toHaveTextContent("Something went wrong")
  })

  it("does not let viewers resend or copy links", () => {
    renderMembers({ workspace: workspace("viewer") })

    expect(screen.getByRole("button", { name: /resend/i })).toBeDisabled()
    expect(screen.getByRole("button", { name: /copy link/i })).toBeDisabled()
  })
})
