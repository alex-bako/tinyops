import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import {
  SourceList,
  SourceListActions,
  SourceListBody,
  SourceListDescription,
  SourceListIcon,
  SourceListRow,
  SourceListStat,
  SourceListStats,
  SourceListTitle,
} from "@workspace/ui/components/source-list"

describe("SourceList", () => {
  it("renders source rows through stable slots without fake button semantics", () => {
    render(
      <SourceList>
        <SourceListRow>
          <SourceListIcon>Icon</SourceListIcon>
          <SourceListBody>
            <SourceListTitle>IMAP mailbox</SourceListTitle>
            <SourceListDescription>hello@example.com</SourceListDescription>
          </SourceListBody>
          <SourceListStats>
            <SourceListStat label="Synced" value="2m ago" />
          </SourceListStats>
          <SourceListActions>
            <button type="button">Sync</button>
          </SourceListActions>
        </SourceListRow>
      </SourceList>
    )

    expect(screen.getByText("IMAP mailbox")).toHaveAttribute(
      "data-slot",
      "source-list-title"
    )
    expect(screen.getByText("2m ago")).toHaveAttribute(
      "data-slot",
      "source-list-stat-value"
    )
    expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(1)
  })
})
