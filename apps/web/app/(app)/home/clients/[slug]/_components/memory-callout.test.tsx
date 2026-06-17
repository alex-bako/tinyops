import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MemoryCallout } from "./memory-callout"

describe("MemoryCallout", () => {
  it("renders the summary, confidence and last-generated stamp", () => {
    render(
      <MemoryCallout
        memory={{
          summary: "Anna mostly asks about logistics.",
          confidencePct: 78,
          confidenceWidth: "78%",
          lastGenerated: "Generated 2h ago, from 9 events",
        }}
      />
    )

    expect(
      screen.getByText("Anna mostly asks about logistics.")
    ).toBeInTheDocument()
    expect(screen.getByText("78%")).toBeInTheDocument()
    expect(
      screen.getByText("Generated 2h ago, from 9 events")
    ).toBeInTheDocument()
  })
})
