import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { JoinFlow } from "@/components/join/join-flow"
import { acceptWorkspaceInvitationAction } from "@/features/workspaces/actions"
import type { JoinableWorkspace } from "@/features/workspaces/types"

const replace = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("@/features/workspaces/actions", () => ({
  acceptWorkspaceInvitationAction: vi.fn(),
}))

const invitation = (id: string, name: string): JoinableWorkspace => ({
  invitationId: id,
  workspaceId: `ws-${id}`,
  name,
  handle: name.toLowerCase(),
  icon: { kind: "letter", letter: name.slice(0, 1), tone: "cobalt" },
  members: 1,
  role: "viewer",
  invitedByEmail: null,
})

function renderFlow(props: Partial<React.ComponentProps<typeof JoinFlow>> = {}) {
  return render(
    <JoinFlow
      invitations={[invitation("inv-1", "Anna"), invitation("inv-2", "Beta")]}
      email="mia@example.co"
      firstName=""
      lastName=""
      {...props}
    />
  )
}

describe("JoinFlow", () => {
  beforeEach(() => {
    vi.mocked(acceptWorkspaceInvitationAction).mockReset()
    replace.mockReset()
  })

  it("requires a first name before accepting", () => {
    renderFlow()
    const accept = screen.getByRole("button", { name: /accept and join/i })
    expect(accept).toBeDisabled()
    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Mia" },
    })
    expect(accept).toBeEnabled()
  })

  it("accepts the selected invitation with the trimmed name and goes home", async () => {
    vi.mocked(acceptWorkspaceInvitationAction).mockResolvedValue({
      data: {} as never,
    })
    renderFlow({ firstName: "Mia" })

    fireEvent.click(screen.getByRole("radio", { name: /Beta/ }))
    fireEvent.change(screen.getByLabelText("Last name"), {
      target: { value: " Park " },
    })
    fireEvent.click(screen.getByRole("button", { name: /accept and join/i }))

    await waitFor(() =>
      expect(acceptWorkspaceInvitationAction).toHaveBeenCalledWith("inv-2", {
        firstName: "Mia",
        lastName: "Park",
      })
    )
    expect(replace).toHaveBeenCalledWith("/home")
  })

  it("shows the invalid screen when the invitation is gone", async () => {
    vi.mocked(acceptWorkspaceInvitationAction).mockResolvedValue({
      error: "invite_not_found",
    })
    renderFlow({ firstName: "Mia" })
    fireEvent.click(screen.getByRole("button", { name: /accept and join/i }))

    await screen.findByText("This invite is no longer valid")
    expect(screen.getByRole("button", { name: /sign out/i })).toBeInTheDocument()
    expect(replace).not.toHaveBeenCalled()
  })

  it("keeps the form and lets the user retry on other failures", async () => {
    vi.mocked(acceptWorkspaceInvitationAction).mockResolvedValue({
      error: "workspace_action_failed",
    })
    renderFlow({ firstName: "Mia" })
    fireEvent.click(screen.getByRole("button", { name: /accept and join/i }))

    await screen.findByRole("alert")
    expect(
      screen.getByRole("button", { name: /accept and join/i })
    ).toBeEnabled()
  })
})
