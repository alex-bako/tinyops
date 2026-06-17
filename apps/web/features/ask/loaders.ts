import { createSupabaseClientReader } from "@/features/clients/adapters/supabase-client-reader"
import { createOpenAiAnswerSynthesizer } from "@/features/ask/adapters/openai-answer-synthesizer"
import {
  createClientAskApplication,
  type ClientAskApplication,
} from "@/features/ask/application/client-ask"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"

export type ClientAskServerContext = {
  application: ClientAskApplication
}

/**
 * Composition root for the client-scoped Ask surface: authenticated workspace
 * context + Supabase client reader (grounding data) + OpenAI synthesizer.
 * Returns null when there is no authenticated workspace, so the route can 401.
 */
export async function createClientAskServerContext(): Promise<ClientAskServerContext | null> {
  const context = await createWorkspaceRequestContext()
  if (!context) return null

  return {
    application: createClientAskApplication({
      workspaceId: context.activeWorkspace.id,
      reader: createSupabaseClientReader({ client: context.supabase }),
      synthesizer: createOpenAiAnswerSynthesizer(),
    }),
  }
}
