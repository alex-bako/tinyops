import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  SearchField,
  SearchFieldIcon,
  SearchFieldInput,
} from "@workspace/ui/components/search-field"

describe("SearchField", () => {
  it("passes the root variant to child slots", () => {
    render(
      <SearchField variant="compact">
        <SearchFieldIcon>Icon</SearchFieldIcon>
        <SearchFieldInput aria-label="Search clients" />
      </SearchField>
    )

    expect(screen.getByText("Icon")).toHaveAttribute("data-variant", "compact")
    expect(screen.getByLabelText("Search clients")).toHaveAttribute(
      "data-variant",
      "compact"
    )
  })

  it("lets child slots override the inherited variant", () => {
    render(
      <SearchField variant="compact">
        <SearchFieldIcon variant="hero">Icon</SearchFieldIcon>
      </SearchField>
    )

    expect(screen.getByText("Icon")).toHaveAttribute("data-variant", "hero")
  })
})
