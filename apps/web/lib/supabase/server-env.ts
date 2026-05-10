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

export function getSyncWorkerSecret() {
  return requiredEnv("SYNC_WORKER_SECRET")
}

export function getOptionalSyncWorkerSecret() {
  return process.env.SYNC_WORKER_SECRET?.trim() || null
}

export function getOptionalTinyOpsAppBaseUrl() {
  return process.env.TINYOPS_APP_BASE_URL?.trim() || null
}

export function getCronSecret() {
  return requiredEnv("CRON_SECRET")
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  return {
    url: getSupabaseServerUrl(),
    serviceRoleKey: getSupabaseServiceRoleKey(),
  }
}
