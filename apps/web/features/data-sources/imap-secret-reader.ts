import type { ImapSecretReader } from "@/features/data-sources/application"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>
type Query = {
  select(columns: string): Query
  eq(column: string, value: unknown): Query
  is(column: string, value: unknown): Query
  maybeSingle(): QueryResult<Record<string, unknown>>
}

type SecretClient = {
  from(table: string): Query
  schema(schema: string): { from(table: string): Query }
}

export function createSupabaseImapSecretReader({
  client,
}: {
  client?: SecretClient
} = {}): ImapSecretReader {
  return {
    async readImapPassword(input) {
      const secretClient =
        client ?? (createSupabaseAdminClient() as unknown as SecretClient)
      const source = await maybeSingle(
        secretClient
          .from("data_sources")
          .select("id")
          .eq("id", input.sourceId)
          .eq("workspace_id", input.workspaceId)
          .eq("source_type", "imap")
          .is("disconnected_at", null) as unknown as Query
      )
      if (!source) throw new Error("source_not_found")

      const secret = await maybeSingle(
        secretClient
          .from("data_source_secrets")
          .select("vault_secret_id")
          .eq("source_id", input.sourceId)
          .eq("purpose", "imap_password")
          .is("replaced_at", null) as unknown as Query
      )
      const vaultSecretId = stringField(secret, "vault_secret_id")
      if (!vaultSecretId) throw new Error("invalid_imap_config")

      const decrypted = await maybeSingle(
        secretClient
          .schema("vault")
          .from("decrypted_secrets")
          .select("decrypted_secret")
          .eq("id", vaultSecretId) as unknown as Query
      )
      const password = stringField(decrypted, "decrypted_secret")
      if (!password) throw new Error("invalid_imap_config")

      return password
    },
  }
}

async function maybeSingle(query: Query) {
  const { data, error } = await query.maybeSingle()
  if (error) throw new Error("source_action_failed", { cause: error })
  return data
}

function stringField(row: Record<string, unknown> | null, key: string) {
  const value = row?.[key]
  return typeof value === "string" ? value : ""
}
