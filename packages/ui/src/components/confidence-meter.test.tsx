import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ConfidenceMeter } from "@workspace/ui/components/confidence-meter"

describe("ConfidenceMeter", () => {
  it("renders the label, percent, and a fill sized to the percentage", () => {
    render(<ConfidenceMeter pct={78} />)

    expect(screen.getByText("Confidence")).toBeInTheDocument()
    expect(screen.getByText("78%")).toBeInTheDocument()
    expect(screen.getByTestId("confidence-fill")).toHaveStyle({ width: "78%" })
  })

  it("clamps an out-of-range percentage into [0, 100]", () => {
    render(<ConfidenceMeter pct={142} />)

    expect(screen.getByText("100%")).toBeInTheDocument()
    expect(screen.getByTestId("confidence-fill")).toHaveStyle({ width: "100%" })
  })
})
