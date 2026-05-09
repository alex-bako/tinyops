import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { normalizeEmail } from "@/lib/auth/email"

export type AuthenticatedUser = {
  id: string
  email?: string | null
}

export async function acceptInviteAndUpsertProfile(
  user: AuthenticatedUser,
  client: SupabaseClient<Database>
) {
  const email = normalizeEmail(user.email)
  if (!email) {
    throw new Error("Authenticated user is missing a valid email")
  }

  const profileResult = await client.from("profiles").upsert(
    {
      id: user.id,
      email,
    },
    { onConflict: "id" }
  )

  if (profileResult.error) {
    throw new Error("Could not upsert profile", {
      cause: profileResult.error,
    })
  }

  const inviteResult = await client
    .from("auth_invites")
    .update({ accepted_at: new Date().toISOString() })
    .eq("email", email)
    .is("accepted_at", null)

  if (inviteResult.error) {
    throw new Error("Could not accept invite", {
      cause: inviteResult.error,
    })
  }
}
