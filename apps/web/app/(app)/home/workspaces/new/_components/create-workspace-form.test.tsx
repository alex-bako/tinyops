import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  checkWorkspaceHandleAvailability,
  createWorkspaceAction,
} from "@/features/workspaces/actions"
import { HANDLE_CHECK_DEBOUNCE_MS } from "@/features/workspaces/use-handle-availability"

import { CreateWorkspaceForm } from "./create-workspace-form"

const push = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, refresh }),
}))

vi.mock("@/features/workspaces/actions", () => ({
  checkWorkspaceHandleAvailability: vi.fn(),
  createWorkspaceAction: vi.fn(),
}))

const checkHandle = vi.mocked(checkWorkspaceHandleAvailability)
const create = vi.mocked(createWorkspaceAction)

/**
 * One change event per character, carrying the value so far - the way a person types.
 * A single whole-value change is one keystroke and hides any defect in how a field
 * reacts to the second one (OBI-12), which is the defect this milestone started from.
 */
function type(field: HTMLElement, value: string) {
  for (let i = 1; i <= value.length; i++) {
    fireEvent.change(field, { target: { value: value.slice(0, i) } })
  }
}

const name = () => screen.getByLabelText("Workspace name")
const handle = () => screen.getByLabelText("URL handle")
const hint = () => screen.getByRole("status")
const createButton = () =>
  screen.getByRole("button", { name: /create workspace/i })

/** Past the debounce, with whatever answer is queued delivered. */
async function settleAvailability() {
  await act(async () => {
    vi.advanceTimersByTime(HANDLE_CHECK_DEBOUNCE_MS)
  })
}

describe("CreateWorkspaceForm", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    checkHandle.mockResolvedValue({ status: "free" })
    create.mockResolvedValue({ data: undefined } as never)
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("follows the whole name into the handle, not just its first character", async () => {
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")

    expect(handle()).toHaveValue("park-therapy")
  })

  it("stops following the name once the handle is someone's own choice", async () => {
    render(<CreateWorkspaceForm />)

    type(name(), "Park")
    type(handle(), "clinic")
    type(name(), "Park Therapy")

    expect(handle()).toHaveValue("clinic")
  })

  it("follows the name again after the handle is emptied", async () => {
    render(<CreateWorkspaceForm />)

    type(name(), "Park")
    type(handle(), "clinic")
    fireEvent.change(handle(), { target: { value: "" } })
    type(name(), "Park Therapy")

    // An empty handle is not a choice. Without this there is no way back to the
    // derivation short of reloading the page.
    expect(handle()).toHaveValue("park-therapy")
  })

  it("says why a handle under three characters cannot be used", async () => {
    render(<CreateWorkspaceForm />)

    type(name(), "Pa")

    expect(hint()).toHaveTextContent("at least 3 characters")
    expect(handle()).toHaveAttribute("aria-invalid", "true")
    expect(createButton()).toBeDisabled()
  })

  it("says whether a handle is free while it is being typed", async () => {
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()

    expect(checkHandle).toHaveBeenCalledWith("park-therapy")
    await waitFor(() => expect(hint()).toHaveTextContent("That handle is free."))
    expect(createButton()).toBeEnabled()
  })

  it("names the free alternative when the handle is taken", async () => {
    checkHandle.mockResolvedValue({
      status: "taken",
      suggestion: "park-therapy-2",
    })
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()

    // In the message as well as on the button: on the button alone it exists only for
    // people who can see it.
    await waitFor(() =>
      expect(hint()).toHaveTextContent(
        "That handle is taken. park-therapy-2 is free."
      )
    )
    expect(createButton()).toBeDisabled()

    fireEvent.click(screen.getByRole("button", { name: "Use park-therapy-2" }))
    expect(handle()).toHaveValue("park-therapy-2")
  })

  it("does not block on a check that could not be made", async () => {
    checkHandle.mockRejectedValue(new Error("offline"))
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()

    await waitFor(() => expect(hint()).toHaveTextContent("You can continue."))
    expect(createButton()).toBeEnabled()
  })

  it("reports a handle taken between the answer and the write, at the handle", async () => {
    create.mockResolvedValue({ error: "workspace_handle_taken" } as never)
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()
    await act(async () => {
      fireEvent.click(createButton())
    })

    expect(hint()).toHaveTextContent("That handle was taken just now.")
    expect(handle()).toHaveAttribute("aria-invalid", "true")
    expect(push).not.toHaveBeenCalled()
  })

  // T5-X1: this only happens if the server's rule and this form's ever drift apart, which
  // is the one case where the sentence has to be true of every input the server refuses -
  // it refuses "!!!" for having no letters, not for being short.
  it("does not blame the length when the server refuses the handle", async () => {
    create.mockResolvedValue({ error: "invalid_workspace_handle" } as never)
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()
    await act(async () => {
      fireEvent.click(createButton())
    })

    expect(hint()).toHaveTextContent("That handle cannot be used.")
    expect(hint()).not.toHaveTextContent("at least 3 characters")
    expect(handle()).toHaveAttribute("aria-invalid", "true")
    expect(push).not.toHaveBeenCalled()
  })

  it("clears the rejection when the refused handle changes, and brings it back", async () => {
    create.mockResolvedValue({ error: "workspace_handle_taken" } as never)
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()
    await act(async () => {
      fireEvent.click(createButton())
    })

    fireEvent.change(handle(), { target: { value: "park-clinic" } })
    expect(hint()).not.toHaveTextContent("taken just now")

    // The rejection was about that value, and it is still true of it.
    fireEvent.change(handle(), { target: { value: "park-therapy" } })
    expect(hint()).toHaveTextContent("That handle was taken just now.")
  })

  it("keeps a failure it cannot attribute away from the handle", async () => {
    create.mockResolvedValue({ error: "workspace_action_failed" } as never)
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()
    await act(async () => {
      fireEvent.click(createButton())
    })

    expect(screen.getByText("Could not create workspace.")).toBeInTheDocument()
    expect(hint()).not.toHaveTextContent("taken just now")
  })

  // Exit-gate step 5, here as well as in onboarding: the field sanitizes what is typed
  // into it, and does not eat the first character doing so.
  it("sanitizes a handle typed straight into the field", async () => {
    render(<CreateWorkspaceForm />)

    type(handle(), "Park Therapy")

    expect(handle()).toHaveValue("park-therapy")
  })

  it("says the blocking reason, not the advisory one", async () => {
    checkHandle.mockResolvedValue({ status: "taken", suggestion: null })
    render(<CreateWorkspaceForm />)

    // At the cap AND taken. "Capped at 63 characters" is advisory and would leave the
    // button disabled for a reason that is never on screen.
    type(handle(), "x".repeat(63))
    await settleAvailability()

    await waitFor(() => expect(hint()).toHaveTextContent("That handle is taken."))
    expect(createButton()).toBeDisabled()
  })

  it("keeps the name and description already typed when the write collides", async () => {
    create.mockResolvedValue({ error: "workspace_handle_taken" } as never)
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    fireEvent.change(screen.getByLabelText("Description"), {
      target: { value: "Counselling practice" },
    })
    await settleAvailability()
    await act(async () => {
      fireEvent.click(createButton())
    })

    expect(name()).toHaveValue("Park Therapy")
    expect(screen.getByLabelText("Description")).toHaveValue(
      "Counselling practice"
    )
  })

  it("sends the derived handle, not the name", async () => {
    render(<CreateWorkspaceForm />)

    type(name(), "Park Therapy")
    await settleAvailability()
    await act(async () => {
      fireEvent.click(createButton())
    })

    expect(create).toHaveBeenCalledWith({
      name: "Park Therapy",
      handle: "park-therapy",
      description: "",
    })
    expect(push).toHaveBeenCalledWith("/home/settings")
  })
})
