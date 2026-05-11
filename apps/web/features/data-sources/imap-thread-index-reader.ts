import {
  normalizeMessageId,
  type ImapThreadIndexReader,
} from "@/features/data-sources/imap-threading"

type QueryResult<T> = PromiseLike<{
  data: T | null
  error: { message: string } | null
}>

export type SupabaseImapThreadIndexReaderClient = {
  rpc(
    functionName: "read_imap_thread_message_ids",
    args: {
      target_workspace_id: string
      target_source_id: string
    }
  ): QueryResult<string[]>
}

export function createSupabaseImapThreadIndexReader({
  client,
}: {
  client: SupabaseImapThreadIndexReaderClient
}): ImapThreadIndexReader {
  return {
    async read(input) {
      const { data, error } = await client.rpc("read_imap_thread_message_ids", {
        target_workspace_id: input.workspaceId,
        target_source_id: input.sourceId,
      })

      if (error) throw new Error("imap_thread_index_read_failed", { cause: error })

      return {
        messageIds: Array.from(
          new Set(
            (data ?? []).flatMap((value) => {
              const normalized = normalizeMessageId(value)
              return normalized ? [normalized] : []
            })
          )
        ),
      }
    },
  }
}
