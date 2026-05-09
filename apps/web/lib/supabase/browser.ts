import { createBrowserClient } from "@supabase/ssr"

import type { Database } from "@/lib/database.types"
import {
  getSupabasePublishableKey,
  getSupabasePublicUrl,
} from "@/lib/supabase/public-env"

export function createBrowserSupabaseClient() {
  return createBrowserClient<Database>(
    getSupabasePublicUrl(),
    getSupabasePublishableKey()
  )
}
