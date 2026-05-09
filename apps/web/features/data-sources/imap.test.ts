import { describe, expect, it } from "vitest"

import {
  applyImapConfigPatch,
  buildImapConnectionPatch,
  buildImapImportSettingsPatch,
  normalizeImapConfigDraft,
} from "@/features/data-sources/imap"

const currentConfig = {
  host: "imap.example.com",
  port: 993,
  encryption: "ssl" as const,
  username: "hello@example.com",
  historyWindow: "12mo" as const,
  watchedFolders: ["INBOX", "Clients"],
  skipSenders: ["*@noreply.*"],
}

describe("IMAP data source domain", () => {
  it("normalizes a full IMAP config draft through one domain module", () => {
    expect(
      normalizeImapConfigDraft({
        host: " IMAP.EXAMPLE.COM ",
        port: "993",
        encryption: "starttls",
        username: " hello@example.com ",
        historyWindow: "90d",
        watchedFolders: [" INBOX ", "", " Clients "],
        skipSenders: [" *@noreply.* ", ""],
      })
    ).toEqual({
      host: "imap.example.com",
      port: 993,
      encryption: "starttls",
      username: "hello@example.com",
      historyWindow: "90d",
      watchedFolders: ["INBOX", "Clients"],
      skipSenders: ["*@noreply.*"],
    })
  })

  it("builds an import settings patch without connection settings", () => {
    expect(
      buildImapImportSettingsPatch({
        historyWindow: "30d",
        watchedFolders: ["Archive", " "],
        skipSenders: ["notifications@example.com"],
      })
    ).toEqual({
      historyWindow: "30d",
      watchedFolders: ["Archive"],
      skipSenders: ["notifications@example.com"],
    })
  })

  it("builds a connection patch without import settings", () => {
    expect(
      buildImapConnectionPatch({
        host: " imap.fastmail.com ",
        port: "993",
        encryption: "ssl",
        username: " admin@example.com ",
      })
    ).toEqual({
      host: "imap.fastmail.com",
      port: 993,
      encryption: "ssl",
      username: "admin@example.com",
    })
  })

  it("merges IMAP patches without stale UI-owned config reconstruction", () => {
    expect(
      applyImapConfigPatch(
        currentConfig,
        buildImapImportSettingsPatch({
          historyWindow: "all",
          watchedFolders: ["Receipts"],
          skipSenders: [],
        })
      )
    ).toEqual({
      ...currentConfig,
      historyWindow: "all",
      watchedFolders: ["Receipts"],
      skipSenders: [],
    })
  })

  it("rejects invalid host, username, and port before adapters run", () => {
    expect(() =>
      normalizeImapConfigDraft({
        host: "",
        port: "70000",
        encryption: "ssl",
        username: "",
        historyWindow: "12mo",
        watchedFolders: [],
        skipSenders: [],
      })
    ).toThrow("invalid_imap_config")
  })
})
