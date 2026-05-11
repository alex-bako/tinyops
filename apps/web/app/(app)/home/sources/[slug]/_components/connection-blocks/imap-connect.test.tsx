import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  connectImapDataSourceAction,
  updateImapConnectionSettingsAction,
} from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { ImapConnect } from "./imap-connect"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  connectImapDataSourceAction: vi.fn(async () => ({ data: {} })),
  updateImapConnectionSettingsAction: vi.fn(async () => ({ data: {} })),
}))

function source(patch: Partial<DataSource> = {}): DataSource {
  return {
    id: "imap",
    icon: "mail",
    title: "IMAP mailbox",
    sub: "hello@example.com",
    category: "Mail",
    auth: "imap",
    cardinality: "singleton",
    sourceRowId: "source_1",
    sourceRowIds: ["source_1"],
    connected: true,
    stats: [],
    imap: {
      host: "imap.example.com",
      port: 993,
      encryption: "ssl",
      username: "hello@example.com",
      historyWindow: "12mo",
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
      messageFilters: {
        mode: "and",
        rules: [
          {
            id: "rule_1",
            field: "subject",
            operator: "does_not_contain",
            value: "invoice",
          },
        ],
      },
      availableFolders: [{ path: "INBOX", messages: 1204 }],
    },
    ...patch,
  } as DataSource
}

describe("ImapConnect", () => {
  beforeEach(() => {
    refresh.mockReset()
    vi.mocked(connectImapDataSourceAction).mockClear()
    vi.mocked(updateImapConnectionSettingsAction).mockClear()
  })

  it("updates an existing connection when a new password is entered", async () => {
    render(<ImapConnect source={source()} />)

    fireEvent.change(screen.getByPlaceholderText("Leave blank to keep"), {
      target: { value: "new-secret" },
    })
    fireEvent.click(screen.getByRole("button", { name: /Save settings/i }))

    await waitFor(() =>
      expect(updateImapConnectionSettingsAction).toHaveBeenCalledWith(
        "source_1",
        {
          host: "imap.example.com",
          port: "993",
          encryption: "ssl",
          username: "hello@example.com",
          password: "new-secret",
        }
      )
    )
    expect(connectImapDataSourceAction).not.toHaveBeenCalled()
  })
})
