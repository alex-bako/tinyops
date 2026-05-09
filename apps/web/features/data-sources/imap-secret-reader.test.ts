import { describe, expect, it } from "vitest"

import { createSupabaseImapSecretReader } from "@/features/data-sources/imap-secret-reader"

function queryChain(
  table: string,
  calls: unknown[],
  rows: Record<string, unknown>
) {
  const api = {
    select(columns: string) {
      calls.push({ table, method: "select", columns })
      return api
    },
    eq(column: string, value: unknown) {
      calls.push({ table, method: "eq", column, value })
      return api
    },
    is(column: string, value: unknown) {
      calls.push({ table, method: "is", column, value })
      return api
    },
    maybeSingle() {
      calls.push({ table, method: "maybeSingle" })
      return Promise.resolve(rows[table] ?? { data: null, error: null })
    },
  }
  return api
}

describe("IMAP secret reader", () => {
  it("reads the active IMAP password from Vault for a workspace source", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, {
          data_sources: { data: { id: "source_1" }, error: null },
          data_source_secrets: {
            data: { vault_secret_id: "secret_1" },
            error: null,
          },
        })
      },
      schema(schema: string) {
        calls.push({ method: "schema", schema })
        return {
          from(table: string) {
            return queryChain(`${schema}.${table}`, calls, {
              "vault.decrypted_secrets": {
                data: { decrypted_secret: "stored-secret" },
                error: null,
              },
            })
          },
        }
      },
    }

    const reader = createSupabaseImapSecretReader({ client: client as never })

    await expect(
      reader.readImapPassword({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).resolves.toBe("stored-secret")
    expect(calls).toContainEqual({
      table: "data_sources",
      method: "eq",
      column: "workspace_id",
      value: "workspace_1",
    })
    expect(calls).toContainEqual({
      table: "data_source_secrets",
      method: "eq",
      column: "purpose",
      value: "imap_password",
    })
    expect(calls).toContainEqual({ method: "schema", schema: "vault" })
  })

  it("does not read Vault when the source does not belong to the workspace", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        return queryChain(table, calls, {
          data_sources: { data: null, error: null },
        })
      },
      schema() {
        throw new Error("unexpected vault read")
      },
    }

    const reader = createSupabaseImapSecretReader({ client: client as never })

    await expect(
      reader.readImapPassword({
        workspaceId: "workspace_1",
        sourceId: "source_1",
      })
    ).rejects.toThrow("source_not_found")
  })
})
