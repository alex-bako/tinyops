import { composePersonName } from "@/features/clients/domain/client-profile"
import type {
  AskThreadReaderPort,
  AskThreadTurn,
  AskThreadWriterPort,
} from "@/features/ask/domain/ask-thread"
import type { GroundedAnswerData } from "@/features/ask/domain/grounded-answer"
import type { Json } from "@/lib/database.types"

// Supabase adapters for the shared client Ask thread (public.client_ask_turns).
// They mirror the loose-client style of the client note writer/reader: a minimal
// structural `from()` client so a typed Supabase client is accepted and the row
// shapes stay local to the adapter. RLS scopes access; we pass workspace_id and
// client_id explicitly and leave created_by to the DB default (auth.uid()).

type AskTurnRow = {
  id: string
  question: string
  answer: Json
  created_at: string
  created_by: string | null
  author?: {
    first_name: string | null
    last_name: string | null
    email: string | null
  } | null
}

type QueryResult<T> = Promise<{ data: T | null; error: { message: string } | null }>

type ReaderQuery = {
  select(columns: string): ReaderQuery
  eq(column: string, value: unknown): ReaderQuery
  order(column: string, options?: unknown): QueryResult<AskTurnRow[]>
}

type AskTurnInsert = {
  workspace_id: string
  client_id: string
  question: string
  answer: GroundedAnswerData
}

type MutateResult = { error: { message: string } | null }

type MutateBuilder = PromiseLike<MutateResult> & {
  eq(column: string, value: unknown): MutateBuilder
}

type WriterQuery = {
  insert(values: AskTurnInsert): PromiseLike<MutateResult>
  delete(): MutateBuilder
}

export type SupabaseAskThreadClient = {
  from(table: string): unknown
}

const ASK_TURN_COLUMNS = `
  id,
  question,
  answer,
  created_at,
  created_by,
  author:profiles!client_ask_turns_created_by_fkey (
    first_name,
    last_name,
    email
  )
`

export function createSupabaseAskThreadReader({
  client,
}: {
  client: SupabaseAskThreadClient
}): AskThreadReaderPort {
  return {
    async listTurns({ workspaceId, clientId }) {
      const { data, error } = await (client.from("client_ask_turns") as ReaderQuery)
        .select(ASK_TURN_COLUMNS)
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)
        .order("created_at", { ascending: true })

      if (error) {
        throw new Error("ask_thread_read_failed", { cause: error })
      }
      return ((data ?? []) as AskTurnRow[]).map(mapTurnRow)
    },
  }
}

export function createSupabaseAskThreadWriter({
  client,
}: {
  client: SupabaseAskThreadClient
}): AskThreadWriterPort {
  return {
    async appendTurn({ workspaceId, clientId, question, answer }) {
      const { error } = await (client.from("client_ask_turns") as WriterQuery).insert({
        workspace_id: workspaceId,
        client_id: clientId,
        question,
        answer,
      })

      if (error) {
        throw new Error("ask_thread_write_failed", { cause: error })
      }
    },

    // No .select() chained: under RLS a DELETE ... RETURNING can come back empty
    // even when rows were removed. A null error means the clear executed.
    async clearThread({ workspaceId, clientId }) {
      const { error } = await (client.from("client_ask_turns") as WriterQuery)
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("client_id", clientId)

      if (error) {
        throw new Error("ask_thread_write_failed", { cause: error })
      }
    },
  }
}

function mapTurnRow(row: AskTurnRow): AskThreadTurn {
  return {
    id: row.id,
    question: row.question,
    answer: row.answer as unknown as GroundedAnswerData,
    askedBy: row.author
      ? composePersonName({
          firstName: row.author.first_name,
          lastName: row.author.last_name,
          email: row.author.email,
        })
      : null,
    createdAt: row.created_at,
  }
}
