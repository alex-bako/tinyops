import type { SupabaseClient } from "@supabase/supabase-js"

import { buildAuthCallbackUrl, JOIN_PATH } from "@/lib/auth/route-policy"
import type { Database } from "@/lib/database.types"

export type WorkspaceInviteMailer = {
  sendInvite(input: { email: string }): Promise<{ error: Error | null }>
  /** A one-time sign-in link to Join for the invitee (M1.T3); never stored. */
  createLink(input: {
    email: string
  }): Promise<{ link: string | null; error: Error | null }>
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

    async createLink({ email }) {
      const invite = await admin.auth.admin.generateLink({ type: "invite", email })
      const useMagicLink = !!invite.error && isExistingUserError(invite.error)
      const result = useMagicLink
        ? await admin.auth.admin.generateLink({ type: "magiclink", email })
        : invite
      const tokenHash = result.data.properties?.hashed_token
      if (!tokenHash) return { link: null, error: result.error }
      // Same shape as the email templates: the callback verifies the hash
      // server-side, so no PKCE verifier is needed in the invitee's browser.
      const link = new URL(redirectTo)
      link.searchParams.set("token_hash", tokenHash)
      link.searchParams.set("type", useMagicLink ? "magiclink" : "invite")
      return { link: link.toString(), error: null }
    },
  }
}

function isExistingUserError(error: { code?: string; message: string }) {
  return (
    error.code === "email_exists" || /already.*registered/i.test(error.message)
  )
}
