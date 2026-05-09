import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { completeOnboarding } from "@/app/onboarding/actions"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

const replace = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("@/app/onboarding/actions", () => ({
  completeOnboarding: vi.fn(),
}))

async function reachSourceStep() {
  fireEvent.change(screen.getByLabelText("First name"), {
    target: { value: "Jamie" },
  })
  fireEvent.change(screen.getByLabelText("Last name"), {
    target: { value: "Park" },
  })
  fireEvent.change(screen.getByLabelText("How clients know you"), {
    target: { value: "Jamie at Park Therapy" },
  })
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))

  fireEvent.click(
    await screen.findByRole("button", { name: /Therapy or counseling/i })
  )
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))

  fireEvent.change(await screen.findByLabelText("Workspace name"), {
    target: { value: "Park Therapy" },
  })
  await waitFor(() =>
    expect(screen.getByLabelText("URL handle")).toHaveValue("park-therapy")
  )
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))

  fireEvent.click(
    await screen.findByRole("button", {
      name: /Strict/i,
    })
  )
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))

  await screen.findByText("Connect a data source")
}

describe("OnboardingFlow", () => {
  beforeEach(() => {
    vi.mocked(completeOnboarding).mockReset()
    replace.mockReset()
  })

  it("submits the completed onboarding command", async () => {
    vi.mocked(completeOnboarding).mockResolvedValue({
      status: "completed",
      workspaceId: "workspace_1",
    })

    render(<OnboardingFlow />)
    await reachSourceStep()

    fireEvent.click(screen.getByRole("button", { name: /Upload a CSV/i }))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))
    fireEvent.click(
      await screen.findByRole("button", { name: /Open TinyOps/i })
    )

    await waitFor(() =>
      expect(completeOnboarding).toHaveBeenCalledWith({
        firstName: "Jamie",
        lastName: "Park",
        senderName: "Jamie at Park Therapy",
        workspaceName: "Park Therapy",
        workspaceHandle: "park-therapy",
        iconLetter: "P",
        iconTone: "cobalt",
        vertical: "therapy",
        sensitivity: "strict",
        source: { type: "csv" },
        invites: [],
      })
    )
    expect(replace).toHaveBeenCalledWith("/home")
  })

  it("submits a skip-source fallback when IMAP pre-test fails", async () => {
    vi.mocked(completeOnboarding)
      .mockResolvedValueOnce({
        status: "source_error",
        error: "imap_connection_failed",
        fallback: "skip_source",
      })
      .mockResolvedValueOnce({
        status: "completed",
        workspaceId: "workspace_1",
      })

    render(<OnboardingFlow />)
    await reachSourceStep()

    fireEvent.click(screen.getByRole("button", { name: /Email mailbox/i }))
    fireEvent.change(await screen.findByLabelText("IMAP host"), {
      target: { value: "imap.example.com" },
    })
    fireEvent.change(screen.getByLabelText("IMAP username"), {
      target: { value: "jamie@example.co" },
    })
    fireEvent.change(screen.getByLabelText("IMAP password"), {
      target: { value: "wrong-password" },
    })
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))
    fireEvent.click(
      await screen.findByRole("button", { name: /Open TinyOps/i })
    )

    expect(
      await screen.findByRole("alert", { name: /source connection failed/i })
    ).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole("button", { name: /Skip source and finish/i })
    )

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledTimes(2))
    expect(completeOnboarding).toHaveBeenLastCalledWith(
      expect.objectContaining({
        source: { type: "skip" },
      })
    )
    expect(replace).toHaveBeenCalledWith("/home")
  })
})
