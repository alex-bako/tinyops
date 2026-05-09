import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button, ButtonIndicator } from "@workspace/ui/components/button"

describe("Button", () => {
  it("renders as a button by default", () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "data-slot",
      "button"
    )
  })

  it("renders an indicator inside icon actions", () => {
    render(
      <Button aria-label="Notifications" size="icon">
        <span aria-hidden>!</span>
        <ButtonIndicator>3</ButtonIndicator>
      </Button>
    )

    expect(screen.getByText("3")).toHaveAttribute(
      "data-slot",
      "button-indicator"
    )
  })
})
