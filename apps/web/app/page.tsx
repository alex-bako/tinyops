import { redirect } from "next/navigation"

import { DEFAULT_SIGNED_IN_PATH, LOGIN_PATH } from "@/lib/auth/route-policy"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function RootPage() {
  const supabase = await createServerSupabaseClient()
  const session = await readSupabaseAppProfileSession(supabase)

  redirect(session ? DEFAULT_SIGNED_IN_PATH : LOGIN_PATH)
}
