import type { Metadata } from "next"
import { redirect } from "next/navigation"

import { JoinFlow } from "@/components/join/join-flow"
import { ONBOARDING_PATH } from "@/app/onboarding/constants"
import { createSupabaseWorkspaceStore } from "@/features/workspaces/supabase-store"
import { DEFAULT_SIGNED_IN_PATH, LOGIN_PATH } from "@/lib/auth/route-policy"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Join a workspace",
  description: "Accept your invitation and get to work.",
}

export default async function JoinPage() {
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

  // Members accept further invitations from the workspace switcher.
  if (workspaces.length > 0) {
    redirect(DEFAULT_SIGNED_IN_PATH)
  }

  const invitations = session.email
    ? await store.listJoinableWorkspaces(session.email)
    : []

  if (invitations.length === 0) {
    redirect(ONBOARDING_PATH)
  }

  return (
    <JoinFlow
      invitations={invitations}
      email={session.email ?? ""}
      firstName={session.profile?.firstName ?? ""}
      lastName={session.profile?.lastName ?? ""}
    />
  )
}
