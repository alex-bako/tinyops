import { requiredEnv } from "@/lib/supabase/env"

export type SupabasePublicEnv = {
  url: string
  publishableKey: string
}

export function getSupabasePublicUrl() {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
}

export function getSupabasePublishableKey() {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  return {
    url: getSupabasePublicUrl(),
    publishableKey: getSupabasePublishableKey(),
  }
}
