import type { SupabaseClient } from "@supabase/supabase-js"

import { normalizeEmail } from "@/lib/auth/email"
import type { Database } from "@/lib/database.types"

export type ImapRecipientLookup = (input: {
  workspaceId: string
  emails: string[]
}) => Promise<string[]>

export function createSupabaseImapRecipientLookup({
  client,
}: {
  client: Pick<SupabaseClient<Database>, "from">
}): ImapRecipientLookup {
  return async ({ workspaceId, emails }) => {
    const normalized = [
      ...new Set(
        emails.flatMap((email) => {
          const value = normalizeEmail(email)
          return value ? [value] : []
        })
      ),
    ]
    const known: string[] = []
    // Bound both the query URL and result size for messages with many recipients.
    for (let offset = 0; offset < normalized.length; offset += 100) {
      const { data, error } = await client
        .from("clients")
        .select("primary_email")
        .eq("workspace_id", workspaceId)
        .in("primary_email", normalized.slice(offset, offset + 100))
      if (error)
        throw new Error("imap_recipient_lookup_failed", { cause: error })
      known.push(...(data ?? []).map((row) => row.primary_email))
    }
    return known
  }
}
