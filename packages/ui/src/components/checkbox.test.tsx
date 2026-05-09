import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { CheckCard } from "@workspace/ui/components/checkbox"

describe("CheckCard", () => {
  it("renders as a named checkbox through a stable slot", () => {
    render(
      <CheckCard
        label="Sent campaigns"
        description="Subject line, opens, clicks"
      />
    )

    expect(
      screen.getByRole("checkbox", { name: /Sent campaigns/ })
    ).toHaveAttribute("data-slot", "check-card")
  })

  it("supports checked and disabled checkbox states", () => {
    render(<CheckCard label="Automation triggers" defaultChecked disabled />)

    const checkbox = screen.getByRole("checkbox", {
      name: /Automation triggers/,
    })
    expect(checkbox).toBeChecked()
    expect(checkbox).toBeDisabled()
  })
})
