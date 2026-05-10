export type SupabasePublicEnv = {
  url: string
  publishableKey: string
}

export function getSupabasePublicUrl() {
  return requiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL
  )
}

export function getSupabasePublishableKey() {
  return requiredPublicEnv(
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  )
}

export function getSupabasePublicEnv(): SupabasePublicEnv {
  return {
    url: getSupabasePublicUrl(),
    publishableKey: getSupabasePublishableKey(),
  }
}

function requiredPublicEnv(name: string, value: string | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return trimmed
}
