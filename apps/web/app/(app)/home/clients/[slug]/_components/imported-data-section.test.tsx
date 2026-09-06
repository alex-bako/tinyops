import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ImportedDataSection } from "./imported-data-section"

describe("ImportedDataSection", () => {
  it("renders an array attribute as one chip per entry", () => {
    render(
      <ImportedDataSection
        attributes={[
          {
            key: "mailerlite_groups",
            value: ["Paid · annual", "Webinar July"],
            sourceName: "Newsletter",
          },
        ]}
      />
    )

    expect(screen.getByText("Mailerlite groups")).toBeInTheDocument()
    expect(screen.getByText("Paid · annual")).toBeInTheDocument()
    expect(screen.getByText("Webinar July")).toBeInTheDocument()
    expect(screen.queryByText("Paid · annual, Webinar July")).toBeNull()
  })

  it("renders a scalar attribute as text", () => {
    render(
      <ImportedDataSection
        attributes={[
          { key: "mailerlite_status", value: "active", sourceName: null },
        ]}
      />
    )

    expect(screen.getByText("active")).toBeInTheDocument()
  })
})
