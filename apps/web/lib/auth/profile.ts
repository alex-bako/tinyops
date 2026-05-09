import type { SupabaseClient } from "@supabase/supabase-js"

import type { Database } from "@/lib/database.types"
import { normalizeEmail } from "@/lib/auth/email"

export type AuthenticatedUser = {
  id: string
  email?: string | null
}

type ProfileWriteResult = {
  error: { message: string } | null
}

export type ProfileSyncStore = {
  upsertProfile(profile: {
    id: string
    email: string
  }): Promise<ProfileWriteResult>
  acceptInvite(email: string, acceptedAt: string): Promise<ProfileWriteResult>
}

export type ProfileSyncOptions = {
  now?: () => Date
}

export async function acceptInviteAndUpsertProfile(
  user: AuthenticatedUser,
  store: ProfileSyncStore,
  options: ProfileSyncOptions = {}
) {
  const email = normalizeEmail(user.email)
  if (!email) {
    throw new Error("Authenticated user is missing a valid email")
  }

  const profileResult = await store.upsertProfile({
    id: user.id,
    email,
  })

  if (profileResult.error) {
    throw new Error("Could not upsert profile", {
      cause: profileResult.error,
    })
  }

  const acceptedAt = (options.now?.() ?? new Date()).toISOString()
  const inviteResult = await store.acceptInvite(email, acceptedAt)

  if (inviteResult.error) {
    throw new Error("Could not accept invite", {
      cause: inviteResult.error,
    })
  }
}

export function createSupabaseProfileSyncStore(
  client: SupabaseClient<Database>
): ProfileSyncStore {
  return {
    async upsertProfile(profile) {
      const { error } = await client
        .from("profiles")
        .upsert(profile, { onConflict: "id" })
      return { error }
    },
    async acceptInvite(email, acceptedAt) {
      const { error } = await client
        .from("auth_invites")
        .update({ accepted_at: acceptedAt })
        .eq("email", email)
        .is("accepted_at", null)
      return { error }
    },
  }
}

export type AppProfile = {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  onboardedAt: string | null
}

export type AppProfileSession = {
  user: AuthenticatedUser
  profile: AppProfile | null
  email: string | null
}

export type AppProfileSessionReader = {
  getUser(): Promise<{ user: AuthenticatedUser | null }>
  findProfileByUserId(userId: string): Promise<AppProfile | null>
}

export async function readAppProfileSession(
  reader: AppProfileSessionReader
): Promise<AppProfileSession | null> {
  const { user } = await reader.getUser()
  if (!user) return null

  const profile = await reader.findProfileByUserId(user.id)
  const profileEmail = normalizeEmail(profile?.email)
  const fallbackEmail = normalizeEmail(user.email)

  return {
    user,
    profile,
    email: profileEmail ?? fallbackEmail,
  }
}

export function createSupabaseAppProfileSessionReader(
  client: SupabaseClient<Database>
): AppProfileSessionReader {
  return {
    async getUser() {
      const {
        data: { user },
      } = await client.auth.getUser()
      return { user }
    },
    async findProfileByUserId(userId) {
      const { data, error } = await client
        .from("profiles")
        .select("id,email,first_name,last_name,onboarded_at")
        .eq("id", userId)
        .maybeSingle()

      if (error) {
        throw new Error("Could not load app profile", { cause: error })
      }

      return data
        ? {
            id: data.id,
            email: data.email,
            firstName: data.first_name,
            lastName: data.last_name,
            onboardedAt: data.onboarded_at,
          }
        : null
    },
  }
}

export async function readSupabaseAppProfileSession(
  client: SupabaseClient<Database>
) {
  return readAppProfileSession(createSupabaseAppProfileSessionReader(client))
}
