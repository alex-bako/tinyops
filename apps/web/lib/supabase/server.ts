import { createServerClient } from "@supabase/ssr"
import { cookies } from "next/headers"

import type { Database } from "@/lib/database.types"
import {
  getSupabasePublishableKey,
  getSupabasePublicUrl,
} from "@/lib/supabase/public-env"

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabasePublicUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // Server Components cannot set cookies; the proxy refreshes sessions.
          }
        },
      },
    }
  )
}
