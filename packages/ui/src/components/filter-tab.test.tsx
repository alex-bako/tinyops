import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import {
  FilterTab,
  FilterTabCount,
  FilterTabs,
} from "@workspace/ui/components/filter-tab"

function TestTabs({
  value,
  defaultValue = "all",
  onValueChange,
}: {
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  return (
    <FilterTabs
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      aria-label="Filter clients"
    >
      <FilterTab value="all">
        All <FilterTabCount>20</FilterTabCount>
      </FilterTab>
      <FilterTab value="active">Active</FilterTab>
      <FilterTab value="overdue">Overdue</FilterTab>
    </FilterTabs>
  )
}

describe("FilterTabs", () => {
  it("updates uncontrolled selection on click", () => {
    render(<TestTabs />)

    fireEvent.click(screen.getByRole("tab", { name: "Active" }))

    expect(screen.getByRole("tab", { name: "Active" })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })

  it("reports controlled selection changes without mutating selected state", () => {
    const onValueChange = vi.fn()
    render(<TestTabs value="all" onValueChange={onValueChange} />)

    fireEvent.click(screen.getByRole("tab", { name: "Active" }))

    expect(onValueChange).toHaveBeenCalledWith("active")
    expect(screen.getByRole("tab", { name: /All/ })).toHaveAttribute(
      "aria-selected",
      "true"
    )
  })

  it("selects the focused tab with keyboard activation", () => {
    render(<TestTabs />)
    const active = screen.getByRole("tab", { name: "Active" })

    active.focus()
    fireEvent.keyDown(active, { key: " " })

    expect(active).toHaveAttribute("aria-selected", "true")
  })
})
