import * as React from "react"
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { ThemeProvider } from "@/components/theme-provider"

describe("ThemeProvider", () => {
  it("does not render client script tags for forced light theme", () => {
    render(
      <ThemeProvider>
        <main>Workspace</main>
      </ThemeProvider>
    )

    expect(screen.getByText("Workspace")).toBeInTheDocument()
    expect(document.querySelector("script")).toBeNull()
  })
})
