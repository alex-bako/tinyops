import { createClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
} from "@/lib/supabase/env"

export function createSupabaseAdminClient() {
  return createClient<Database>(
    getSupabaseUrl(),
    getSupabaseServiceRoleKey(),
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
