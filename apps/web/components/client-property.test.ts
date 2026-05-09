import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ClientPropertyList,
  ClientPropertyValueView,
} from "./client-property"

describe("client property renderer", () => {
  it("renders tag-and-text values", () => {
    render(
      React.createElement(ClientPropertyValueView, {
        value: {
          kind: "tag-and-text",
          tag: "Overdue",
          text: "Send a light monthly check-in.",
        },
      })
    )

    expect(screen.getByText("Overdue")).toBeInTheDocument()
    expect(screen.getByText("Send a light monthly check-in.")).toBeInTheDocument()
  })

  it("renders avoid properties with the care styling", () => {
    render(
      React.createElement(ClientPropertyList, {
        properties: [
          {
            key: "Avoid",
            icon: "shield-alert",
            avoid: true,
            value: {
              kind: "text",
              value: "Do not mention private intake details.",
            },
          },
        ],
      })
    )

    expect(screen.getByText("Avoid")).toBeInTheDocument()
    expect(screen.getByText("Do not mention private intake details.")).toHaveClass(
      "text-foreground"
    )
  })
})
