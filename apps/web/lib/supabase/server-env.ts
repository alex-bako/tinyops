import { requiredEnv } from "@/lib/supabase/env"

export type SupabaseServerEnv = {
  url: string
  serviceRoleKey: string
}

export function getSupabaseServerUrl() {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
}

export function getSupabaseServiceRoleKey() {
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  return {
    url: getSupabaseServerUrl(),
    serviceRoleKey: getSupabaseServiceRoleKey(),
  }
}
