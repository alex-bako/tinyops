import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Button } from "@workspace/ui/components/button"

describe("Button", () => {
  it("renders as a button by default", () => {
    render(<Button>Save</Button>)

    expect(screen.getByRole("button", { name: "Save" })).toHaveAttribute(
      "data-slot",
      "button"
    )
  })
})
