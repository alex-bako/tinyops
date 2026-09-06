import type { SupabaseClient } from "@supabase/supabase-js"
import { describe, expect, it, vi } from "vitest"

import { createSupabaseImapRecipientLookup } from "./imap-recipient-lookup"
import type { Database } from "@/lib/database.types"

function database(error: { message: string } | null = null) {
  const rows = [
    { workspace_id: "one", primary_email: "anna@example.com" },
    { workspace_id: "two", primary_email: "other@example.com" },
  ]
  let workspaceId = ""
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: string) => {
      expect(column).toBe("workspace_id")
      workspaceId = value
      return query
    }),
    in: vi.fn(async (column: string, emails: string[]) => {
      expect(column).toBe("primary_email")
      return {
        error,
        data: rows.filter(
          (row) =>
            row.workspace_id === workspaceId &&
            emails.includes(row.primary_email)
        ),
      }
    }),
  }
  const from = vi.fn(() => query)
  return {
    query,
    from,
    client: { from } as unknown as Pick<SupabaseClient<Database>, "from">,
  }
}

describe("IMAP recipient lookup", () => {
  it("normalizes, deduplicates, and matches only clients in the target workspace", async () => {
    const db = database()
    const lookup = createSupabaseImapRecipientLookup(db)
    expect(
      await lookup({
        workspaceId: "one",
        emails: [
          " ANNA@EXAMPLE.COM ",
          "anna@example.com",
          "other@example.com",
          "unknown@example.com",
        ],
      })
    ).toEqual(["anna@example.com"])
    expect(db.from).toHaveBeenCalledWith("clients")
    expect(db.query.eq).toHaveBeenCalledWith("workspace_id", "one")
    expect(db.query.in).toHaveBeenCalledWith("primary_email", [
      "anna@example.com",
      "other@example.com",
      "unknown@example.com",
    ])
  })

  it("bounds large recipient lists and avoids queries for empty lists", async () => {
    const db = database()
    const lookup = createSupabaseImapRecipientLookup(db)
    expect(await lookup({ workspaceId: "one", emails: [] })).toEqual([])
    expect(db.from).not.toHaveBeenCalled()
    await lookup({
      workspaceId: "one",
      emails: Array.from({ length: 205 }, (_, i) => `person${i}@example.com`),
    })
    expect(db.query.in.mock.calls.map((call) => call[1].length)).toEqual([
      100, 100, 5,
    ])
  })

  it("fails on lookup errors", async () => {
    const lookup = createSupabaseImapRecipientLookup(
      database({ message: "offline" })
    )
    await expect(
      lookup({ workspaceId: "one", emails: ["anna@example.com"] })
    ).rejects.toThrow("imap_recipient_lookup_failed")
  })
})
