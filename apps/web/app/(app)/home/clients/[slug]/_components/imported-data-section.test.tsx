import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ImportedDataSection } from "./imported-data-section"

describe("ImportedDataSection", () => {
  it.each([
    ["2026-09-06T04:37:26.000Z", "Sep 6, 2026, 04:37 UTC"],
    ["2026-09-06T00:37:26+02:00", "Sep 5, 2026, 22:37 UTC"],
    ["2026-09-06T00:00:00Z", "Sep 6, 2026, 00:00 UTC"],
    ["2026-02-30T04:37:26.000Z", "2026-02-30T04:37:26.000Z"],
    ["2026-13-06T04:37:26.000Z", "2026-13-06T04:37:26.000Z"],
    ["2026-09-06T24:00:00Z", "2026-09-06T24:00:00Z"],
    ["2026-09-06", "2026-09-06"],
    ["2026-09-06T04:37:26", "2026-09-06T04:37:26"],
    ["197834253867680809", "197834253867680809"],
    ["06702316693", "06702316693"],
    [42, "42"],
    [null, "—"],
    ["Subscribed 2026-09-06T04:37:26.000Z", "Subscribed 2026-09-06T04:37:26.000Z"],
  ])("formats only valid complete timestamps: %s", (value, expected) => {
    render(
      <ImportedDataSection
        attributes={[{ key: "imported_value", value, sourceName: null }]}
      />
    )
    expect(screen.getByText(expected)).toBeInTheDocument()
  })

  it("renders an array attribute as one chip per entry", () => {
    render(
      <ImportedDataSection
        attributes={[
          {
            key: "mailerlite_groups",
            value: ["Paid · annual", "Webinar July", "2026-09-06T04:37:26.000Z"],
            sourceName: "Newsletter",
          },
        ]}
      />
    )

    expect(screen.getByText("Mailerlite groups")).toBeInTheDocument()
    expect(screen.getByText("Paid · annual")).toBeInTheDocument()
    expect(screen.getByText("Webinar July")).toBeInTheDocument()
    expect(screen.getByText("2026-09-06T04:37:26.000Z")).toBeInTheDocument()
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
