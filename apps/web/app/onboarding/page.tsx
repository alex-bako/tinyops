import { redirect } from "next/navigation"

import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import { DEFAULT_SIGNED_IN_PATH, LOGIN_PATH } from "@/lib/auth/route-policy"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export default async function OnboardingPage() {
  const supabase = await createServerSupabaseClient()
  const session = await readSupabaseAppProfileSession(supabase)

  if (!session) {
    redirect(LOGIN_PATH)
  }

  const store = createSupabaseWorkspaceStore({
    client: supabase,
    actorUserId: session.user.id,
  })
  const workspaces = await store.listWorkspaces()

  if (session.profile?.onboardedAt && workspaces.length > 0) {
    redirect(DEFAULT_SIGNED_IN_PATH)
  }

  return <OnboardingFlow />
}
