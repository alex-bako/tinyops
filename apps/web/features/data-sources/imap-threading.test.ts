import { describe, expect, it } from "vitest"

import {
  buildImapThreadHeaders,
  createImapThreadIndex,
  detectSentFolders,
  type ImapThreadHeadersInput,
} from "@/features/data-sources/imap-threading"

describe("IMAP threading domain", () => {
  it("normalizes RFC thread headers without subject fallback", () => {
    // @ts-expect-error subjects are intentionally not part of thread identity
    const subjectHeaderInput: ImapThreadHeadersInput = { subject: "Re: Replay access" }
    void subjectHeaderInput

    const headers = buildImapThreadHeaders({
      messageId: " <Reply@Example.COM> ",
      inReplyTo: "<Root@Example.COM>",
      references: ["<Root@Example.COM>", " <Prior@Example.COM> "],
    })

    expect(headers).toEqual({
      messageId: "<reply@example.com>",
      inReplyTo: "<root@example.com>",
      references: ["<root@example.com>", "<prior@example.com>"],
      linkedMessageIds: ["<root@example.com>", "<prior@example.com>"],
      relatedMessageIds: [
        "<reply@example.com>",
        "<root@example.com>",
        "<prior@example.com>",
      ],
      threadKey: "<root@example.com>",
    })

    expect(
      buildImapThreadHeaders({
        messageId: "<same-subject@example.com>",
      }).linkedMessageIds
    ).toEqual([])
  })

  it("tracks anchored message IDs and links only through RFC headers", () => {
    const index = createImapThreadIndex(["<root@example.com>"])

    expect(
      index.isLinked(
        buildImapThreadHeaders({
          messageId: "<reply@example.com>",
          references: ["<root@example.com>"],
        })
      )
    ).toBe(true)
    expect(
      index.isLinked(
        buildImapThreadHeaders({
          messageId: "<unlinked@example.com>",
        })
      )
    ).toBe(false)

    index.anchor(
      buildImapThreadHeaders({
        messageId: "<reply@example.com>",
        references: ["<root@example.com>"],
      })
    )
    expect(
      index.isLinked(
        buildImapThreadHeaders({
          messageId: "<later@example.com>",
          inReplyTo: "<reply@example.com>",
        })
      )
    ).toBe(true)
  })

  it("detects Sent folders by special use, flags, and common folder names", () => {
    expect(
      detectSentFolders([
        { path: "INBOX", messages: 10, specialUse: "\\Inbox" },
        { path: "Sent Items", messages: 3 },
        { path: "[Gmail]/Sent Mail", messages: 4 },
        { path: "Archive", messages: 20, flags: ["\\Sent"] },
      ])
    ).toEqual(["Sent Items", "[Gmail]/Sent Mail", "Archive"])
  })
})
