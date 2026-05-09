import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { PermissionPill } from "@workspace/ui/components/permission-pill"

describe("PermissionPill", () => {
  it("toggles when unlocked and communicates pressed state", () => {
    const onToggle = vi.fn()
    render(<PermissionPill on={false} onToggle={onToggle} />)

    const pill = screen.getByRole("button", {
      name: "Not allowed — click to grant",
    })
    expect(pill).toHaveAttribute("aria-pressed", "false")

    fireEvent.click(pill)

    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it("does not toggle when locked", () => {
    const onToggle = vi.fn()
    render(<PermissionPill on locked onToggle={onToggle} />)

    fireEvent.click(screen.getByRole("button", { name: "Locked" }))

    expect(onToggle).not.toHaveBeenCalled()
  })
})
