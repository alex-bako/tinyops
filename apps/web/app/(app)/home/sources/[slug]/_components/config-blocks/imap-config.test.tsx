import * as React from "react"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  refreshImapFoldersAction,
  updateImapImportSettingsAction,
} from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { ImapConfig } from "./imap-config"

const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}))

vi.mock("@/features/data-sources/actions", () => ({
  updateImapImportSettingsAction: vi.fn(async () => ({ data: {} })),
  refreshImapFoldersAction: vi.fn(async () => ({ data: {} })),
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
      watchedFolders: ["INBOX"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
      availableFolders: [
        { path: "INBOX", messages: 1204 },
        { path: "Clients", messages: 412 },
      ],
    },
    ...patch,
  } as DataSource
}

describe("ImapConfig", () => {
  beforeEach(() => {
    refresh.mockReset()
    vi.mocked(updateImapImportSettingsAction).mockClear()
    vi.mocked(refreshImapFoldersAction).mockClear()
  })

  it("hides folders and filters until the mailbox is connected", () => {
    render(
      <ImapConfig
        source={{
          ...source(),
          connected: false,
          sourceRowId: undefined,
          imap: undefined,
        }}
      />
    )

    expect(screen.queryByText("Folders & filters")).not.toBeInTheDocument()
  })

  it("lists folders from the verified mailbox snapshot instead of mock folders", async () => {
    render(<ImapConfig source={source()} />)

    fireEvent.click(screen.getByRole("button", { name: /Add folder/i }))

    expect(await screen.findByText("Clients")).toBeInTheDocument()
    expect(screen.queryByText("Archive")).not.toBeInTheDocument()
  })

  it("adds and removes message filters before saving intake settings", async () => {
    render(
      <ImapConfig
        source={source({
          imap: {
            ...source().imap!,
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
          },
        })}
      />
    )

    fireEvent.click(screen.getByRole("button", { name: "Remove rule" }))
    fireEvent.click(screen.getByRole("button", { name: /Add rule/i }))
    const ruleInput = screen.getAllByRole("textbox").at(-1)!
    fireEvent.change(ruleInput, { target: { value: "hello@example.com" } })
    fireEvent.click(screen.getByRole("button", { name: /Save import settings/i }))

    await waitFor(() =>
      expect(updateImapImportSettingsAction).toHaveBeenCalledWith("source_1", {
        historyWindow: "12mo",
        watchedFolders: ["INBOX"],
        skipSenders: [],
        messageFilters: {
          mode: "and",
          rules: [
            {
              id: expect.any(String),
              field: "from",
              operator: "contains",
              value: "hello@example.com",
            },
          ],
        },
      })
    )
  })

  it("refreshes mailbox folders on demand", async () => {
    render(<ImapConfig source={source()} />)

    fireEvent.click(screen.getByRole("button", { name: /Refresh folders/i }))

    await waitFor(() =>
      expect(refreshImapFoldersAction).toHaveBeenCalledWith("source_1")
    )
  })
})
