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

export function getGoogleOAuthClientId() {
  return requiredEnv("GOOGLE_OAUTH_CLIENT_ID")
}

export function getGoogleOAuthClientSecret() {
  return requiredEnv("GOOGLE_OAUTH_CLIENT_SECRET")
}

export function getGoogleOAuthRedirectUri() {
  const base = getOptionalTinyOpsAppBaseUrl()
  if (!base) {
    throw new Error(
      "TINYOPS_APP_BASE_URL is required to build the Google OAuth redirect URI"
    )
  }
  return `${base.replace(/\/+$/, "")}/api/oauth/google/callback`
}

export function getGmailOAuthConfig() {
  return {
    clientId: getGoogleOAuthClientId(),
    clientSecret: getGoogleOAuthClientSecret(),
    redirectUri: getGoogleOAuthRedirectUri(),
  }
}

export function getCronSecret() {
  return requiredEnv("CRON_SECRET")
}

export function getDeployHealthSecret() {
  return requiredEnv("DEPLOY_HEALTH_SECRET")
}

export function getSupabaseServerEnv(): SupabaseServerEnv {
  return {
    url: getSupabaseServerUrl(),
    serviceRoleKey: getSupabaseServiceRoleKey(),
  }
}
