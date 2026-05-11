import { describe, expect, it } from "vitest"

import { createSupabaseImapThreadIndexReader } from "@/features/data-sources/imap-thread-index-reader"

describe("Supabase IMAP thread index reader", () => {
  it("reads anchored message IDs through the service-role RPC", async () => {
    const calls: unknown[] = []
    const result = Promise.resolve({
      data: [
        "<reply@example.com>",
        "<root@example.com>",
        "<legacy@example.com>",
      ],
      error: null,
    })

    const reader = createSupabaseImapThreadIndexReader({
      client: {
        rpc(functionName: string, args: unknown) {
          calls.push(["rpc", functionName, args])
          return result
        },
      },
    })

    await expect(
      reader.read({ workspaceId: "workspace_1", sourceId: "source_1" })
    ).resolves.toEqual({
      messageIds: [
        "<reply@example.com>",
        "<root@example.com>",
        "<legacy@example.com>",
      ],
    })
    expect(calls).toEqual([
      [
        "rpc",
        "read_imap_thread_message_ids",
        {
          target_workspace_id: "workspace_1",
          target_source_id: "source_1",
        },
      ],
    ])
  })
})
