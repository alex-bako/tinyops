import * as React from "react"
import { render, screen } from "@testing-library/react"
import { SunIcon } from "lucide-react"
import { describe, expect, it } from "vitest"

import {
  WorkspacePageFooter,
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "./page-surface"

describe("workspace page surface", () => {
  it("renders the standard workspace page container", () => {
    render(React.createElement(WorkspacePageSurface, null, "Body"))

    expect(screen.getByText("Body")).toHaveAttribute(
      "data-slot",
      "workspace-page-surface"
    )
  })

  it("renders page header text with an icon", () => {
    render(
      React.createElement(WorkspacePageHeader, {
        eyebrowIcon: SunIcon,
        eyebrow: "Today",
        title: "Good afternoon",
        description: "Open a client by typing their email.",
      })
    )

    expect(screen.getByText("Today")).toBeInTheDocument()
    expect(
      screen.getByRole("heading", { name: "Good afternoon" })
    ).toBeInTheDocument()
    expect(
      screen.getByText("Open a client by typing their email.")
    ).toBeInTheDocument()
  })

  it("renders footer metadata", () => {
    render(React.createElement(WorkspacePageFooter, null, "3 of 20 shown"))

    expect(screen.getByText("3 of 20 shown")).toHaveAttribute(
      "data-slot",
      "workspace-page-footer"
    )
  })
})
