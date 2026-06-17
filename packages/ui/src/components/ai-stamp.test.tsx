import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { AiStamp } from "@workspace/ui/components/ai-stamp"

describe("AiStamp", () => {
  it("renders its label inside a stamp", () => {
    render(<AiStamp>grounded in Anna's timeline</AiStamp>)

    const stamp = screen.getByText("grounded in Anna's timeline")
    expect(stamp).toBeInTheDocument()
    expect(stamp.closest("[data-slot='ai-stamp']")).not.toBeNull()
  })

  it("marks its tone for styling", () => {
    render(<AiStamp tone="sensitive">firewalled</AiStamp>)

    expect(
      screen.getByText("firewalled").closest("[data-slot='ai-stamp']")
    ).toHaveAttribute("data-tone", "sensitive")
  })
})
