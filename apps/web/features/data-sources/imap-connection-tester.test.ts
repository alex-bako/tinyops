import { describe, expect, it } from "vitest"

import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"

describe("imap connection tester", () => {
  it("connects, lists folders, and logs out without logging credentials", async () => {
    const calls: unknown[] = []
    class FakeImapFlow {
      constructor(options: unknown) {
        calls.push(["constructor", options])
      }

      async connect() {
        calls.push(["connect"])
      }

      async list() {
        calls.push(["list"])
        return [
          { path: "INBOX", status: { messages: 12 } },
          { path: "Clients", status: { messages: 3 } },
        ]
      }

      async logout() {
        calls.push(["logout"])
      }

      close() {
        calls.push(["close"])
      }
    }

    const tester = createImapFlowConnectionTester({
      ImapFlow: FakeImapFlow,
    })

    await expect(
      tester.test({
        host: "imap.example.com",
        port: 993,
        encryption: "ssl",
        username: "hello@example.com",
        password: "top-secret",
      })
    ).resolves.toEqual({
      folders: [
        { path: "INBOX", messages: 12 },
        { path: "Clients", messages: 3 },
      ],
    })
    expect(calls).toEqual([
      [
        "constructor",
        {
          host: "imap.example.com",
          port: 993,
          secure: true,
          doSTARTTLS: false,
          auth: { user: "hello@example.com", pass: "top-secret" },
          logger: false,
        },
      ],
      ["connect"],
      ["list"],
      ["logout"],
    ])
  })

  it("requests STARTTLS when configured", async () => {
    const calls: unknown[] = []
    class FakeImapFlow {
      constructor(options: unknown) {
        calls.push(["constructor", options])
      }

      async connect() {
        calls.push(["connect"])
      }

      async list() {
        calls.push(["list"])
        return []
      }

      async logout() {
        calls.push(["logout"])
      }

      close() {
        calls.push(["close"])
      }
    }

    const tester = createImapFlowConnectionTester({
      ImapFlow: FakeImapFlow,
    })

    await tester.test({
      host: "imap.example.com",
      port: 143,
      encryption: "starttls",
      username: "hello@example.com",
      password: "top-secret",
    })

    expect(calls[0]).toEqual([
      "constructor",
      expect.objectContaining({
        secure: false,
        doSTARTTLS: true,
      }),
    ])
  })
})
