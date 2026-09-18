import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { Workspace } from "@/features/workspaces/types"

import { SectionGeneral } from "./section-general"

function workspace(): Workspace {
  return {
    id: "ws_1",
    name: "Park Therapy",
    handle: "park-therapy",
    description: "Counselling practice",
    icon: { kind: "mark" },
    accent: "cobalt",
    vertical: "therapy",
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
    members: [],
    invites: [],
  }
}

function renderGeneral() {
  const onUpdateProfile = vi.fn()
  render(
    <SectionGeneral workspace={workspace()} onUpdateProfile={onUpdateProfile} />
  )
  return { onUpdateProfile }
}

const handleField = () => screen.getByDisplayValue("park-therapy")
const save = () => screen.getByRole("button", { name: /save changes/i })

describe("SectionGeneral handle", () => {
  // M3.T5: Save sends the name, description and accent in one click. The server now
  // refuses a handle it cannot store, and this screen has nowhere to report that - so a
  // refusable handle has to be caught here, or the rest of the edit is lost in silence.
  it.each(["ab", ""])("will not save %j as a handle", (handle) => {
    const { onUpdateProfile } = renderGeneral()

    fireEvent.change(handleField(), { target: { value: handle } })

    expect(save()).toBeDisabled()
    expect(screen.getByRole("alert")).toHaveTextContent(
      handle ? "at least 3 characters" : "A handle is required."
    )
    fireEvent.click(save())
    expect(onUpdateProfile).not.toHaveBeenCalled()
  })

  it("keeps the rest of the edit reachable once the handle is usable again", () => {
    const { onUpdateProfile } = renderGeneral()
    const name = screen.getByDisplayValue("Park Therapy")

    fireEvent.change(name, { target: { value: "Park Therapy Ltd" } })
    fireEvent.change(handleField(), { target: { value: "ab" } })
    expect(save()).toBeDisabled()

    fireEvent.change(screen.getByDisplayValue("ab"), {
      target: { value: "park-therapy-ltd" },
    })
    fireEvent.click(save())

    expect(onUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Park Therapy Ltd",
        handle: "park-therapy-ltd",
        description: "Counselling practice",
      })
    )
  })

  it("stores the handle it shows", () => {
    const { onUpdateProfile } = renderGeneral()

    // Without sanitizing here, the field would keep "Park Therapy" while the server
    // stored "park-therapy" - a rename nobody saw (OBI-3).
    fireEvent.change(handleField(), { target: { value: "Park Therapy" } })

    expect(screen.getByDisplayValue("park-therapy")).toBeInTheDocument()
    fireEvent.click(save())
    expect(onUpdateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ handle: "park-therapy" })
    )
  })
})
