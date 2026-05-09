import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import type { SourcesPageRow } from "../_view-model"
import { SourceRow } from "./source-row"

const baseRow: SourcesPageRow = {
  id: "imap",
  icon: "mail",
  title: "IMAP mailbox",
  sub: "hello@example.com",
  connected: true,
  isNew: false,
  stats: [{ id: "synced", label: "Synced", value: "2m ago" }],
  action: "sync",
  href: "/home/sources/imap",
  primaryLabel: "Sync",
  configureLabel: "Configure IMAP mailbox",
  statusLabel: "2m ago",
}

describe("SourceRow", () => {
  it("renders navigation and explicit row actions from row intent", () => {
    render(<SourceRow source={baseRow} />)

    expect(
      screen.getByRole("link", { name: "Configure IMAP mailbox" })
    ).toHaveAttribute("href", "/home/sources/imap")
    expect(screen.getByRole("button", { name: "Sync" })).toBeInTheDocument()
    expect(screen.getAllByRole("button")).toHaveLength(2)
  })
})
