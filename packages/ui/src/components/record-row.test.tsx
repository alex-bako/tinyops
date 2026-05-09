import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { RecordRow } from "@workspace/ui/components/record-row"

describe("RecordRow", () => {
  it("renders static content without fake button semantics by default", () => {
    render(<RecordRow>Static row</RecordRow>)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.getByText("Static row")).toHaveAttribute(
      "data-slot",
      "record-row"
    )
  })

  it("keeps link semantics when rendered as child", () => {
    render(
      <RecordRow asChild>
        <a href="/home/clients/anna-smith">Anna Smith</a>
      </RecordRow>
    )

    expect(screen.getByRole("link", { name: "Anna Smith" })).toHaveAttribute(
      "href",
      "/home/clients/anna-smith"
    )
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
