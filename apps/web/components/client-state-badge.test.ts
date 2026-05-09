import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ClientStateBadgeList } from "./client-state-badge"

describe("client state badge views", () => {
  it("renders badges in one grouped presenter", () => {
    render(
      React.createElement(ClientStateBadgeList, {
        badges: [
          { kind: "active", label: "Active", dot: true },
          { kind: "tag", label: "March cohort" },
        ],
      })
    )

    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText("March cohort")).toBeInTheDocument()
  })

  it("renders empty fallback when no badges exist", () => {
    render(
      React.createElement(ClientStateBadgeList, {
        badges: [],
        empty: React.createElement("span", null, "No flags"),
      })
    )

    expect(screen.getByText("No flags")).toBeInTheDocument()
  })
})
