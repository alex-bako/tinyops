"use server"

import { headers } from "next/headers"

import {
  createSupabaseInviteLookupClient,
  isInvitedEmail,
} from "@/lib/auth/invites"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"

import {
  requestMagicLinkWithDependencies,
  type RequestMagicLinkDependencies,
} from "@/app/login/_request-magic-link"
import type { LoginState } from "@/app/login/_state"

async function getRequestOrigin() {
  const requestHeaders = await headers()
  const origin = requestHeaders.get("origin")
  if (origin) return origin

  const host = requestHeaders.get("host")
  if (host) return `http://${host}`

  return "http://127.0.0.1:3000"
}

export async function requestMagicLink(
  previousState: LoginState,
  formData: FormData
) {
  const inviteLookup = createSupabaseInviteLookupClient(
    createSupabaseAdminClient()
  )
  const dependencies: RequestMagicLinkDependencies = {
    getOrigin: () => {
      throw new Error("Origin is loaded before request dependencies run")
    },
    isInvited: (email) => isInvitedEmail(email, inviteLookup),
    sendMagicLink: async ({ email, emailRedirectTo }) => {
      const supabase = await createServerSupabaseClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          shouldCreateUser: true,
        },
      })
      return { error }
    },
  }

  const origin = await getRequestOrigin()
  return requestMagicLinkWithDependencies(previousState, formData, {
    ...dependencies,
    getOrigin: () => origin,
  })
}
