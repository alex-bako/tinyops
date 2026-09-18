import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { completeOnboarding } from "@/app/onboarding/actions"
import { checkWorkspaceHandleAvailability } from "@/features/workspaces/actions"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

const replace = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
}))

vi.mock("@/app/onboarding/actions", () => ({
  completeOnboarding: vi.fn(),
}))

vi.mock("@/features/workspaces/actions", () => ({
  checkWorkspaceHandleAvailability: vi.fn(),
}))

const checkHandle = vi.mocked(checkWorkspaceHandleAvailability)

/**
 * Drive a field the way a person does: one change event per character, carrying the
 * value so far. A single whole-value change is one keystroke and hides any defect in
 * how a field reacts to the second one (OBI-12).
 */
function type(field: HTMLElement, value: string) {
  for (let i = 1; i <= value.length; i++) {
    fireEvent.change(field, { target: { value: value.slice(0, i) } })
  }
}

async function reachWorkspaceStep() {
  type(screen.getByLabelText("First name"), "Jamie")
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))
  fireEvent.click(
    await screen.findByRole("button", { name: /Therapy or counseling/i })
  )
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))
  await screen.findByLabelText("Workspace name")
}

async function reachSourceStep() {
  type(screen.getByLabelText("First name"), "Jamie")
  type(screen.getByLabelText("Last name"), "Park")
  type(screen.getByLabelText("How clients know you"), "Jamie at Park Therapy")
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))

  fireEvent.click(
    await screen.findByRole("button", { name: /Therapy or counseling/i })
  )
  fireEvent.click(screen.getByRole("button", { name: /continue/i }))

  type(await screen.findByLabelText("Workspace name"), "Park Therapy")
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
    checkHandle.mockReset()
    checkHandle.mockResolvedValue({ status: "free" })
    replace.mockReset()
  })

  it("keeps the sender name following both name fields", async () => {
    render(<OnboardingFlow />)

    type(screen.getByLabelText("First name"), "Alex")
    expect(screen.getByLabelText("How clients know you")).toHaveValue("Alex")

    type(screen.getByLabelText("Last name"), "Bakó")
    expect(screen.getByLabelText("How clients know you")).toHaveValue(
      "Alex Bakó"
    )
  })

  it("stops deriving the sender name once it is edited", async () => {
    render(<OnboardingFlow />)

    type(screen.getByLabelText("First name"), "Alex")
    type(screen.getByLabelText("Last name"), "Bakó")
    expect(screen.getByLabelText("How clients know you")).toHaveValue(
      "Alex Bakó"
    )

    type(
      screen.getByLabelText("How clients know you"),
      "Alex at Bako Studio"
    )
    type(screen.getByLabelText("Last name"), "Bakos")

    expect(screen.getByLabelText("How clients know you")).toHaveValue(
      "Alex at Bako Studio"
    )
  })

  it("hands the sender name back when it is cleared", async () => {
    render(<OnboardingFlow />)

    type(screen.getByLabelText("First name"), "Alex")
    type(
      screen.getByLabelText("How clients know you"),
      "Alex at Bako Studio"
    )

    fireEvent.change(screen.getByLabelText("How clients know you"), {
      target: { value: "" },
    })
    expect(screen.getByLabelText("How clients know you")).toHaveValue("")

    fireEvent.change(screen.getByLabelText("First name"), {
      target: { value: "Alexa" },
    })
    expect(screen.getByLabelText("How clients know you")).toHaveValue("Alexa")
  })

  it("keeps the handle and icon letter following the workspace name", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    type(screen.getByLabelText("Workspace name"), "Park Therapy")

    expect(screen.getByLabelText("URL handle")).toHaveValue("park-therapy")
    expect(
      screen.getAllByRole("button", { name: "P", pressed: true })
    ).toHaveLength(1)
  })

  it("stops deriving the handle once it is edited", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    type(screen.getByLabelText("Workspace name"), "Park")
    expect(screen.getByLabelText("URL handle")).toHaveValue("park")

    type(screen.getByLabelText("URL handle"), "park-clinic")
    type(screen.getByLabelText("Workspace name"), "Park Therapy")

    expect(screen.getByLabelText("URL handle")).toHaveValue("park-clinic")
  })

  it("derives the icon letter from the trimmed workspace name", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    // A leading space is the one input where the derived letter and the swatch's own
    // `workspaceName[0]` fallback disagree, so this pins the derivation rather than
    // the fallback. Both uppercase, so a lowercase name would not distinguish them.
    type(screen.getByLabelText("Workspace name"), " Park Therapy")

    expect(
      screen.getAllByRole("button", { name: "P", pressed: true })
    ).toHaveLength(1)
    expect(screen.getByLabelText("URL handle")).toHaveValue("park-therapy")
  })

  it("re-applies the sensitivity default when the vertical changes", async () => {
    render(<OnboardingFlow />)

    type(screen.getByLabelText("First name"), "Jamie")
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    fireEvent.click(await screen.findByRole("button", { name: /Coaching/i }))
    fireEvent.click(
      screen.getByRole("button", { name: /Therapy or counseling/i })
    )
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    type(await screen.findByLabelText("Workspace name"), "Park Therapy")
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    // Coaching first, then Therapy, and assert Strict - not the reverse. Coaching's
    // default is `balanced`, which is also INITIAL_DATA.sensitivity, so a
    // therapy -> coaching test asserting Balanced passes even with the derivation
    // deleted. This direction fails both if the derivation goes and if its guard flips.
    expect(
      await screen.findByRole("button", { name: /Strict/i })
    ).toHaveAttribute("aria-pressed", "true")
  })

  it("keeps a sensitivity chosen after the vertical when the vertical is re-selected", async () => {
    render(<OnboardingFlow />)

    type(screen.getByLabelText("First name"), "Jamie")
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    fireEvent.click(await screen.findByRole("button", { name: /Coaching/i }))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    type(await screen.findByLabelText("Workspace name"), "Park Therapy")
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))

    fireEvent.click(await screen.findByRole("button", { name: /Strict/i }))
    fireEvent.click(screen.getByRole("button", { name: /back/i }))
    fireEvent.click(screen.getByRole("button", { name: /back/i }))

    // Re-selecting the same vertical must not overwrite the choice just made.
    fireEvent.click(await screen.findByRole("button", { name: /Coaching/i }))
    fireEvent.click(screen.getByRole("button", { name: /continue/i }))
    fireEvent.click(await screen.findByRole("button", { name: /continue/i }))

    expect(
      await screen.findByRole("button", { name: /Strict/i })
    ).toHaveAttribute("aria-pressed", "true")
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

  // M3.T2 -----------------------------------------------------------------
  // The handle field is the one place these rules are visible, so each case drives it
  // the way a person does and reads back both the value and the message.

  it("lowercases a typed handle instead of eating the capital", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    // The reported defect: the field's own `replace(/[^a-z0-9-]/g, "")` deleted `P`.
    type(screen.getByLabelText("URL handle"), "Park")

    expect(screen.getByLabelText("URL handle")).toHaveValue("park")
  })

  it("reports a too-short handle at its own field and holds Continue", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    type(screen.getByLabelText("Workspace name"), "Pa")

    expect(screen.getByLabelText("URL handle")).toHaveValue("pa")
    expect(screen.getByRole("status")).toHaveTextContent(
      "A handle needs at least 3 characters."
    )
    expect(screen.getByLabelText("URL handle")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled()

    // The name is not what is wrong, so nothing may appear on it.
    expect(screen.getAllByRole("status")).toHaveLength(1)
    expect(screen.getByRole("status")).toHaveAttribute("id", "ob-handle-hint")
    expect(screen.getByLabelText("Workspace name")).not.toHaveAttribute(
      "aria-invalid"
    )
  })

  it("reports a trailing dash while it is being typed and holds Continue", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    // A name that is itself fine, so only the handle can be what blocks Continue.
    type(screen.getByLabelText("Workspace name"), "Park Therapy")
    type(screen.getByLabelText("URL handle"), "park-")

    expect(screen.getByLabelText("URL handle")).toHaveValue("park-")
    expect(screen.getByRole("status")).toHaveTextContent(
      "A handle cannot end with a dash."
    )
    expect(screen.getByLabelText("URL handle")).toHaveAttribute(
      "aria-invalid",
      "true"
    )
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled()

    // ...and typing past it clears both, which is why the dash is kept at all.
    type(screen.getByLabelText("URL handle"), "park-clinic")
    expect(screen.getByLabelText("URL handle")).not.toHaveAttribute(
      "aria-invalid"
    )
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
  })

  it("caps a long name's handle and says so without blocking", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    type(screen.getByLabelText("Workspace name"), "x".repeat(70))

    expect(screen.getByLabelText("URL handle")).toHaveValue("x".repeat(63))
    expect(
      screen.getByText("A handle is capped at 63 characters.")
    ).toBeInTheDocument()
    // Advisory, not an error: the handle is storable, so Continue stays available.
    expect(screen.getByLabelText("URL handle")).not.toHaveAttribute(
      "aria-invalid"
    )
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
  })

  it("derives a clean handle from a name wrapped in dashes", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    // Derived, not typed: no dash may survive at either end (M3.T2 acceptance).
    type(screen.getByLabelText("Workspace name"), "--park--")

    expect(screen.getByLabelText("URL handle")).toHaveValue("park")
    expect(screen.getByLabelText("URL handle")).not.toHaveAttribute(
      "aria-invalid"
    )
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
  })

  it("says a handle is required and keeps following the name after it is emptied", async () => {
    render(<OnboardingFlow />)
    await reachWorkspaceStep()

    type(screen.getByLabelText("Workspace name"), "Park Therapy")
    expect(screen.getByLabelText("URL handle")).toHaveValue("park-therapy")

    // A lone dash sanitizes away to nothing. The field looks identical to a backspaced
    // one, so it must behave identically: still empty, still explained, still derived.
    fireEvent.change(screen.getByLabelText("URL handle"), {
      target: { value: "-" },
    })

    expect(screen.getByLabelText("URL handle")).toHaveValue("")
    expect(screen.getByRole("status")).toHaveTextContent("A handle is required.")
    expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled()

    type(screen.getByLabelText("Workspace name"), "Park Clinic")
    expect(screen.getByLabelText("URL handle")).toHaveValue("park-clinic")
    expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
  })

  describe("handle availability", () => {
    it("says a free handle is free without blocking anything", async () => {
      render(<OnboardingFlow />)
      await reachWorkspaceStep()

      type(screen.getByLabelText("Workspace name"), "Park Therapy")

      expect(await screen.findByText(/that handle is free/i)).toBeInTheDocument()
      expect(checkHandle).toHaveBeenCalledWith("park-therapy")
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
    })

    it("reports a taken handle and offers one that is free", async () => {
      checkHandle.mockImplementation(async (handle) =>
        handle === "park-therapy"
          ? { status: "taken", suggestion: "park-therapy-2" }
          : { status: "free" }
      )

      render(<OnboardingFlow />)
      await reachWorkspaceStep()

      type(screen.getByLabelText("Workspace name"), "Park Therapy")

      // The alternative is announced and not only drawn: the live region is everything a
      // screen reader gets without tabbing on to find the button.
      expect(await screen.findByText(/that handle is taken/i)).toHaveTextContent(
        "That handle is taken. park-therapy-2 is free."
      )
      // A handle someone else holds is as invalid as a malformed one, and has to say so
      // to assistive technology, not only in coral text.
      expect(screen.getByLabelText("URL handle")).toHaveAttribute(
        "aria-invalid",
        "true"
      )
      // A taken handle is a dead end, so Continue must not be available - the whole
      // point of asking before submit rather than after it.
      await waitFor(() =>
        expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled()
      )

      fireEvent.click(screen.getByRole("button", { name: "Use park-therapy-2" }))

      expect(screen.getByLabelText("URL handle")).toHaveValue("park-therapy-2")
      await waitFor(() =>
        expect(checkHandle).toHaveBeenCalledWith("park-therapy-2")
      )
      expect(await screen.findByText(/that handle is free/i)).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
    })

    it("stops the accepted suggestion from being overwritten by the name", async () => {
      checkHandle.mockImplementation(async (handle) =>
        handle === "park-therapy"
          ? { status: "taken", suggestion: "park-therapy-2" }
          : { status: "free" }
      )

      render(<OnboardingFlow />)
      await reachWorkspaceStep()
      type(screen.getByLabelText("Workspace name"), "Park Therapy")

      fireEvent.click(
        await screen.findByRole("button", { name: "Use park-therapy-2" })
      )

      // Accepting a suggestion is editing the handle: typing more of the name must not
      // silently take back the handle the person just chose.
      type(screen.getByLabelText("Workspace name"), "Park Therapy North")
      expect(screen.getByLabelText("URL handle")).toHaveValue("park-therapy-2")
    })

    it("never asks about a handle the format rule already rejects", async () => {
      render(<OnboardingFlow />)
      await reachWorkspaceStep()

      type(screen.getByLabelText("Workspace name"), "Pa")

      expect(
        await screen.findByText(/at least 3 characters/i)
      ).toBeInTheDocument()
      await waitFor(() => expect(checkHandle).not.toHaveBeenCalled())
      expect(screen.getByRole("button", { name: /continue/i })).toBeDisabled()
    })

    it("lets the flow continue when the check itself cannot be made (OBI-9)", async () => {
      checkHandle.mockRejectedValue(new Error("database unreachable"))

      render(<OnboardingFlow />)
      await reachWorkspaceStep()

      type(screen.getByLabelText("Workspace name"), "Park Therapy")

      expect(
        await screen.findByText(/could not check whether that handle is free/i)
      ).toBeInTheDocument()
      expect(screen.getByRole("button", { name: /continue/i })).toBeEnabled()
    })
  })
})
