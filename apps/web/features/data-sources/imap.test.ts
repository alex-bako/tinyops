import { describe, expect, it } from "vitest"

import {
  buildDefaultImapIntakeSettings,
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
  buildImapIntakeSettings,
  normalizeImapMessageFilters,
} from "@/features/data-sources/imap"

describe("IMAP data source domain", () => {
  it("normalizes connection settings without intake settings", () => {
    expect(
      buildImapConnectionConfig({
        host: " IMAP.EXAMPLE.COM ",
        port: "993",
        encryption: "starttls",
        username: " hello@example.com ",
      })
    ).toEqual({
      host: "imap.example.com",
      port: 993,
      encryption: "starttls",
      username: "hello@example.com",
    })
  })

  it("normalizes intake settings without connection or folder snapshot", () => {
    expect(
      buildImapIntakeSettings({
        historyWindow: "30d",
        watchedFolders: ["Archive", " "],
        skipSenders: [" notifications@example.com ", ""],
        messageFilters: {
          mode: "and",
          rules: [
            {
              id: "rule_1",
              field: "To",
              operator: "does not contain",
              value: " invoice ",
            },
            {
              id: "empty",
              field: "subject",
              operator: "contains",
              value: " ",
            },
          ],
        },
      })
    ).toEqual({
      historyWindow: "30d",
      watchedFolders: ["Archive"],
      skipSenders: ["notifications@example.com"],
      messageFilters: {
        mode: "and",
        rules: [
          {
            id: "rule_1",
            field: "to",
            operator: "does_not_contain",
            value: "invoice",
          },
        ],
      },
    })
  })

  it("builds default intake from verified folders with no message filters", () => {
    expect(
      buildDefaultImapIntakeSettings({
        historyWindow: "bogus",
        folderSnapshot: {
          availableFolders: [
            { path: "Clients", messages: 7 },
            { path: "INBOX", messages: 42 },
          ],
        },
      })
    ).toEqual({
      historyWindow: "12mo",
      watchedFolders: ["INBOX"],
      skipSenders: [],
      messageFilters: { mode: "and", rules: [] },
    })
  })

  it("keeps selected stale folders while storing the latest folder snapshot separately", () => {
    expect(
      buildImapIntakeSettings({
        historyWindow: "all",
        watchedFolders: ["INBOX", "Old Clients"],
        skipSenders: [],
        messageFilters: { mode: "and", rules: [] },
      }).watchedFolders
    ).toEqual(["INBOX", "Old Clients"])

    expect(
      buildImapFolderSnapshot([{ path: "INBOX", messages: 12 }])
    ).toEqual({
      availableFolders: [{ path: "INBOX", messages: 12 }],
    })
  })

  it("coerces folder snapshots and message filters from untrusted persistence", () => {
    expect(
      buildImapFolderSnapshot([
        { path: " INBOX ", messages: 12, specialUse: "\\Inbox", flags: ["\\HasNoChildren"] },
        { path: " Sent ", messages: 4, specialUse: "\\Sent", flags: ["\\Sent", 42] },
        { path: "Bad", messages: -1 },
        { path: "", messages: 3 },
      ])
    ).toEqual({
      availableFolders: [
        {
          path: "INBOX",
          messages: 12,
          specialUse: "\\Inbox",
          flags: ["\\HasNoChildren"],
        },
        {
          path: "Sent",
          messages: 4,
          specialUse: "\\Sent",
          flags: ["\\Sent"],
        },
        { path: "Bad", messages: null },
      ],
    })

    expect(
      normalizeImapMessageFilters({
        mode: "or",
        rules: [{ field: "From", operator: "is not", value: " boss@example.com " }],
      })
    ).toEqual({
      mode: "and",
      rules: [
        {
          id: "rule_1",
          field: "from",
          operator: "is_not",
          value: "boss@example.com",
        },
      ],
    })
  })

  it("rejects invalid host, username, and port before adapters run", () => {
    expect(() =>
      buildImapConnectionConfig({
        host: "",
        port: "70000",
        encryption: "ssl",
        username: "",
      })
    ).toThrow("invalid_imap_config")
  })
})
