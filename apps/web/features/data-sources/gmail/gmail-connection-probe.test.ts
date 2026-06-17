import { describe, expect, it, vi } from "vitest"

import {
  createGmailConnectionProbe,
  gmailLabelsToAvailableFolders,
} from "@/features/data-sources/gmail/gmail-connection-probe"
import type { GmailApiClient } from "@/features/data-sources/gmail/gmail-api-client"

function fakeApiClient(overrides: Partial<GmailApiClient> = {}): GmailApiClient {
  return {
    getProfile: vi.fn().mockResolvedValue({ emailAddress: "owner@gmail.com", historyId: "42" }),
    listLabels: vi.fn().mockResolvedValue([
      { id: "INBOX", name: "INBOX", type: "system", messagesTotal: 120 },
      { id: "Label_7", name: "Clients", type: "user", messagesTotal: 8 },
    ]),
    listMessages: vi.fn(),
    getMessageRaw: vi.fn(),
    listHistory: vi.fn(),
    ...overrides,
  }
}

describe("Gmail connection probe", () => {
  it("returns the authenticated address and label list", async () => {
    const client = fakeApiClient()
    const probe = createGmailConnectionProbe({ apiClientFactory: () => client })

    const result = await probe.probe({ accessToken: "access-1" })

    expect(result.emailAddress).toBe("owner@gmail.com")
    expect(result.labels.map((label) => label.id)).toEqual(["INBOX", "Label_7"])
  })

  it("maps labels to the available_folders snapshot keyed by label id", () => {
    const folders = gmailLabelsToAvailableFolders([
      { id: "INBOX", name: "INBOX", type: "system", messagesTotal: 120 },
      { id: "Label_7", name: "Clients", type: "user", messagesTotal: 8 },
    ])

    expect(folders).toEqual([
      { path: "INBOX", name: "INBOX", messages: 120, specialUse: "system" },
      { path: "Label_7", name: "Clients", messages: 8, specialUse: "user" },
    ])
  })
})
