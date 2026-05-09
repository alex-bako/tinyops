import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  ClientIdentityHeader,
  ClientIdentityInline,
  ClientIdentityLink,
} from "./client-identity"

describe("client identity", () => {
  it("renders client name and email inline", () => {
    render(
      React.createElement(ClientIdentityInline, {
        name: "Anna Smith",
        email: "anna@example.com",
      })
    )

    expect(screen.getByText("Anna Smith")).toBeInTheDocument()
    expect(screen.getByText("anna@example.com")).toBeInTheDocument()
  })

  it("keeps link semantics for client rows", () => {
    render(
      React.createElement(ClientIdentityLink, {
        href: "/home/clients/anna-smith",
        name: "Anna Smith",
        email: "anna@example.com",
      })
    )

    expect(screen.getByRole("link", { name: /Anna Smith/ })).toHaveAttribute(
      "href",
      "/home/clients/anna-smith"
    )
  })

  it("renders header metadata and badges", () => {
    render(
      React.createElement(ClientIdentityHeader, {
        name: "Anna Smith",
        email: "anna@example.com",
        location: "Berlin, DE",
        badges: [{ kind: "active", label: "Active", dot: true }],
      })
    )

    expect(
      screen.getByRole("heading", { name: "Anna Smith" })
    ).toBeInTheDocument()
    expect(screen.getByText("anna@example.com")).toBeInTheDocument()
    expect(screen.getByText("Berlin, DE")).toBeInTheDocument()
    expect(screen.getByText("Active")).toBeInTheDocument()
  })
})
