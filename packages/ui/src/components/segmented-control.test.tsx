import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { SegmentedControl } from "@workspace/ui/components/segmented-control"

describe("SegmentedControl", () => {
  it("renders radio options and reports selected changes", () => {
    const onChange = vi.fn()
    render(
      <SegmentedControl
        value="one"
        onChange={onChange}
        options={[
          { value: "one", label: "One" },
          { value: "two", label: "Two" },
        ]}
      />
    )

    expect(screen.getByRole("radio", { name: "One" })).toHaveAttribute(
      "aria-checked",
      "true"
    )

    fireEvent.click(screen.getByRole("radio", { name: "Two" }))

    expect(onChange).toHaveBeenCalledWith("two")
  })
})
