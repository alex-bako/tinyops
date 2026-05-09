function requiredEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

export function getSupabaseUrl() {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_URL")
}

export function getSupabasePublishableKey() {
  return requiredEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
}

export function getSupabaseServiceRoleKey() {
  return requiredEnv("SUPABASE_SERVICE_ROLE_KEY")
}
