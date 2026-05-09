import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import {
  getSupabaseServiceRoleKey,
  getSupabaseServerUrl,
} from "@/lib/supabase/server-env"

export function createSupabaseAdminClient() {
  return createClient<Database>(
    getSupabaseServerUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
