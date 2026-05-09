import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { Meter } from "@workspace/ui/components/meter"

describe("Meter", () => {
  it("clamps progress width to a valid fraction", () => {
    render(<Meter label="Usage" value="12 / 10" fraction={1.2} />)

    expect(screen.getByText("Usage")).toBeInTheDocument()
    expect(screen.getByTestId("meter-fill")).toHaveStyle({ width: "100%" })
  })
})
