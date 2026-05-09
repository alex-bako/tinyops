import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"

type InviteLookupResult = {
  data: { email: string } | null
  error: { message: string } | null
}

export type InviteLookupClient = {
  findInviteByEmail(email: string): Promise<InviteLookupResult>
}

export async function isInvitedEmail(
  email: string,
  client: InviteLookupClient
) {
  const { data, error } = await client.findInviteByEmail(email)

  if (error) {
    throw new Error("Could not check invite", { cause: error })
  }

  return data != null
}

export function createSupabaseInviteLookupClient(
  client: SupabaseClient<Database>
): InviteLookupClient {
  return {
    async findInviteByEmail(email) {
      const { data, error } = await client
        .from("auth_invites")
        .select("email")
        .eq("email", email)
        .maybeSingle()

      return { data, error }
    },
  }
}
