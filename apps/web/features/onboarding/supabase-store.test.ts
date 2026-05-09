import { describe, expect, it } from "vitest"

import { createSupabaseOnboardingStore } from "@/features/onboarding/supabase-store"
import type { OnboardingPersistenceInput } from "@/features/onboarding/application"

const input = {
  actorUserId: "user_1",
  actorEmail: "jamie@example.co",
  profile: {
    firstName: "Jamie",
    lastName: "Park",
    onboardedAt: "2026-05-10T01:02:03.000Z",
  },
  workspace: {
    name: "Park Therapy",
    handle: "park-therapy",
    iconKind: "letter",
    iconLetter: "P",
    iconTone: "cobalt",
    accent: "cobalt",
    vertical: "therapy",
    defaultSenderName: "Jamie at Park Therapy",
    initialSourceIntent: "csv",
    sensitivity: {
      mode: "strict",
      autoSendThreshold: "low-only",
      manualReviewKeywords: ["crisis", "trauma"],
      excludeFromOutbound: true,
    },
  },
  invites: [{ email: "new.member@example.co", role: "operator" }],
} satisfies OnboardingPersistenceInput

describe("supabase onboarding store", () => {
  it("persists onboarding through the transactional RPC", async () => {
    const calls: unknown[] = []
    const client = {
      rpc(fn: string, args: unknown) {
        calls.push({ fn, args })
        return Promise.resolve({ data: "workspace_1", error: null })
      },
    }

    const store = createSupabaseOnboardingStore({ client: client as never })

    await expect(store.completeOnboarding(input)).resolves.toEqual({
      workspaceId: "workspace_1",
    })
    expect(calls).toEqual([
      {
        fn: "complete_onboarding",
        args: {
          actor_email: "jamie@example.co",
          profile_first_name: "Jamie",
          profile_last_name: "Park",
          profile_onboarded_at: "2026-05-10T01:02:03.000Z",
          workspace_name: "Park Therapy",
          workspace_handle: "park-therapy",
          workspace_icon_kind: "letter",
          workspace_icon_letter: "P",
          workspace_icon_tone: "cobalt",
          workspace_accent: "cobalt",
          workspace_vertical: "therapy",
          workspace_default_sender_name: "Jamie at Park Therapy",
          workspace_initial_source_intent: "csv",
          workspace_sensitivity_mode: "strict",
          workspace_auto_send_threshold: "low-only",
          workspace_manual_review_keywords: ["crisis", "trauma"],
          workspace_exclude_from_outbound: true,
          invite_emails: ["new.member@example.co"],
          invite_roles: ["operator"],
        },
      },
    ])
  })

  it("preserves RPC errors for the application seam", async () => {
    const client = {
      rpc() {
        return Promise.resolve({
          data: null,
          error: { message: "invalid_invite_email" },
        })
      },
    }
    const store = createSupabaseOnboardingStore({ client: client as never })

    await expect(store.completeOnboarding(input)).rejects.toThrow(
      "invalid_invite_email"
    )
  })
})
