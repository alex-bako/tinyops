import type { SupabaseClient } from "@supabase/supabase-js"

import type {
  OnboardingPersistenceInput,
  OnboardingStore,
} from "@/features/onboarding/application"
import type { Database } from "@/lib/database.types"

type OnboardingSupabaseClient = Pick<SupabaseClient<Database>, "rpc">

export function createSupabaseOnboardingStore({
  client,
}: {
  client: OnboardingSupabaseClient
}): OnboardingStore {
  return {
    async completeOnboarding(input: OnboardingPersistenceInput) {
      const { data, error } = await client.rpc("complete_onboarding", {
        actor_email: input.actorEmail,
        profile_first_name: input.profile.firstName,
        profile_last_name: input.profile.lastName ?? "",
        profile_onboarded_at: input.profile.onboardedAt,
        workspace_name: input.workspace.name,
        workspace_handle: input.workspace.handle,
        workspace_icon_kind: input.workspace.iconKind,
        workspace_icon_letter: input.workspace.iconLetter,
        workspace_icon_tone: input.workspace.iconTone,
        workspace_accent: input.workspace.accent,
        workspace_vertical: input.workspace.vertical,
        workspace_default_sender_name: input.workspace.defaultSenderName,
        workspace_initial_source_intent: input.workspace.initialSourceIntent,
        workspace_sensitivity_mode: input.workspace.sensitivity.mode,
        workspace_auto_send_threshold:
          input.workspace.sensitivity.autoSendThreshold,
        workspace_manual_review_keywords:
          input.workspace.sensitivity.manualReviewKeywords,
        workspace_exclude_from_outbound:
          input.workspace.sensitivity.excludeFromOutbound,
        invite_emails: input.invites.map((invite) => invite.email),
        invite_roles: input.invites.map((invite) => invite.role),
      })

      if (error) throw new Error(error.message, { cause: error })

      return { workspaceId: String(data) }
    },
  }
}
