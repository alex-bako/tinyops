import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAuthCallbackUrl, JOIN_PATH } from "@/lib/auth/route-policy"
import type { Database } from "@/lib/database.types"

export type WorkspaceInviteMailer = {
  sendInvite(input: { email: string }): Promise<{ error: Error | null }>
}

/**
 * Emails a sign-in link that lands on Join (M1.T2). New addresses get a
 * Supabase invite; addresses that already have an account get a magic link so
 * the existing user keeps a single account across workspaces (INV-11).
 */
export function createSupabaseInviteMailer({
  admin,
  origin,
}: {
  admin: Pick<SupabaseClient<Database>, "auth">
  origin: string
}): WorkspaceInviteMailer {
  const redirectTo = buildAuthCallbackUrl(origin, JOIN_PATH)

  return {
    async sendInvite({ email }) {
      const invited = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo,
      })
      if (!invited.error) return { error: null }
      if (!isExistingUserError(invited.error)) return { error: invited.error }

      const { error } = await admin.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: redirectTo, shouldCreateUser: false },
      })
      return { error }
    },
  }
}

function isExistingUserError(error: { code?: string; message: string }) {
  return (
    error.code === "email_exists" || /already.*registered/i.test(error.message)
  )
}
