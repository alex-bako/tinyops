import { createSupabaseClientReader } from "@/features/clients/adapters/supabase-client-reader"
import { createOpenAiAnswerSynthesizer } from "@/features/ask/adapters/openai-answer-synthesizer"
import {
  createSupabaseAskThreadReader,
  createSupabaseAskThreadWriter,
} from "@/features/ask/adapters/supabase-ask-thread"
import {
  askThreadToMessages,
  createClientAskApplication,
  type AskMessage,
  type ClientAskApplication,
} from "@/features/ask/application/client-ask"
import type {
  AskThreadReaderPort,
  AskThreadWriterPort,
} from "@/features/ask/domain/ask-thread"
import { canManageNotes } from "@/features/clients/application/notes-policy"
import { composePersonName } from "@/features/clients/domain/client-profile"
import { createWorkspaceRequestContext } from "@/features/data-sources/request-context"

export type ClientAskServerContext = {
  /** Active workspace, for scoping the shared thread. */
  workspaceId: string
  application: ClientAskApplication
  /** Reads the persisted thread (history + hydration). */
  threadReader: AskThreadReaderPort
  /** Appends completed turns and clears the thread. */
  threadWriter: AskThreadWriterPort
  /** Display name of the acting user, stamped onto answers for attribution. */
  askedBy: string | null
}

/**
 * Composition root for the client-scoped Ask surface: authenticated workspace
 * context + Supabase client reader (grounding data) + OpenAI synthesizer + the
 * shared-thread reader/writer. Returns null when there is no authenticated
 * workspace, so the route can 401.
 */
export async function createClientAskServerContext(): Promise<ClientAskServerContext | null> {
  const context = await createWorkspaceRequestContext()
  if (!context) return null

  return {
    workspaceId: context.activeWorkspace.id,
    application: createClientAskApplication({
      workspaceId: context.activeWorkspace.id,
      reader: createSupabaseClientReader({ client: context.supabase }),
      synthesizer: createOpenAiAnswerSynthesizer(),
    }),
    threadReader: createSupabaseAskThreadReader({ client: context.supabase }),
    threadWriter: createSupabaseAskThreadWriter({ client: context.supabase }),
    askedBy: composePersonName({
      firstName: context.session.profile?.firstName ?? null,
      lastName: context.session.profile?.lastName ?? null,
      email: context.session.email,
    }),
  }
}

export type ClientAskThreadHydration = {
  /** Persisted thread reconstructed as AI SDK history for `useChat`. */
  initialMessages: AskMessage[]
  /** Asker display name, for optimistic attribution of the in-flight turn. */
  currentUserName: string | null
  /** Only owners/admins may clear the shared thread. */
  canClearThread: boolean
}

/**
 * Page-level hydration for the Ask thread: reads the shared, persisted thread for
 * a client and reconstructs it as `useChat` history, plus the acting user's name
 * and whether they may clear it. Falls back to an empty, read-only thread when
 * unauthenticated.
 */
export async function loadClientAskThread({
  clientId,
}: {
  clientId: string
}): Promise<ClientAskThreadHydration> {
  const context = await createWorkspaceRequestContext()
  if (!context) {
    return { initialMessages: [], currentUserName: null, canClearThread: false }
  }

  const reader = createSupabaseAskThreadReader({ client: context.supabase })
  const turns = await reader.listTurns({
    workspaceId: context.activeWorkspace.id,
    clientId,
  })

  return {
    initialMessages: askThreadToMessages(turns),
    currentUserName: composePersonName({
      firstName: context.session.profile?.firstName ?? null,
      lastName: context.session.profile?.lastName ?? null,
      email: context.session.email,
    }),
    canClearThread: canManageNotes(context.activeWorkspace.role),
  }
}
