"use server"

import { revalidatePath } from "next/cache"

import {
  createOnboardingApplication,
  type OnboardingCommand,
  type OnboardingResult,
} from "@/features/onboarding/application"
import { createSupabaseOnboardingStore } from "@/features/onboarding/supabase-store"
import { createSupabaseInviteMailer } from "@/features/workspaces/invite-mailer"
import { createSupabaseDataSourceStore } from "@/features/data-sources/supabase-store"
import { createImapFlowConnectionTester } from "@/features/data-sources/imap-connection-tester"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"
import { readSupabaseAppProfileSession } from "@/lib/auth/profile"
import { getRequestOrigin } from "@/lib/auth/request-origin"
import { createSupabaseAdminClient } from "@/lib/supabase/admin"
import { createServerSupabaseClient } from "@/lib/supabase/server"

export async function completeOnboarding(
  command: OnboardingCommand
): Promise<OnboardingResult> {
  const supabase = await createServerSupabaseClient()
  const session = await readSupabaseAppProfileSession(supabase)
  if (!session) {
    return { status: "validation_error", error: "not_authenticated" }
  }

  const application = createOnboardingApplication({
    actor: { userId: session.user.id, email: session.email },
    store: createSupabaseOnboardingStore({ client: supabase }),
    dataSourceStore: createSupabaseDataSourceStore({ client: supabase }),
    imapConnectionTester: createImapFlowConnectionTester(),
    mailer: createSupabaseInviteMailer({
      admin: createSupabaseAdminClient(),
      origin: await getRequestOrigin(),
    }),
  })

  const result = await application.complete(command)
  if (result.status === "completed") {
    revalidatePath(DEFAULT_SIGNED_IN_PATH, "layout")
    revalidatePath("/onboarding")
  }

  return result
}
