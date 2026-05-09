import { NextResponse, type NextRequest } from "next/server"

import { acceptInviteAndUpsertProfile } from "@/lib/auth/profile"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"

import { handleAuthCallback } from "@/app/auth/callback/_callback"

export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const admin = createSupabaseAdminClient()

  const redirectPath = await handleAuthCallback(new URL(request.url), {
    exchangeCodeForSession: async (code) => {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      return { error }
    },
    getUser: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      return { user }
    },
    syncProfile: (user) => acceptInviteAndUpsertProfile(user, admin),
  })

  return NextResponse.redirect(new URL(redirectPath, request.url))
}
