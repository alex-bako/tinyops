import { ImapFlow } from "imapflow"

import type {
  ImapConnectionTestInput,
  ImapConnectionTester,
} from "@/features/data-sources/types"

type ImapFlowConstructor = new (options: {
  host: string
  port: number
  secure: boolean
  auth: { user: string; pass: string }
  logger: false
}) => {
  connect(): Promise<void>
  list(options?: unknown): Promise<
    Array<{ path: string; status?: { messages?: number | null } | null }>
  >
  logout(): Promise<void>
  close(): void
}

export function createImapFlowConnectionTester({
  ImapFlow: ImapFlowClient = ImapFlow as ImapFlowConstructor,
}: {
  ImapFlow?: ImapFlowConstructor
} = {}): ImapConnectionTester {
  return {
    async test(input: ImapConnectionTestInput) {
      const client = new ImapFlowClient({
        host: input.host,
        port: input.port,
        secure: input.encryption === "ssl",
        auth: {
          user: input.username,
          pass: input.password,
        },
        logger: false,
      })

      try {
        await client.connect()
        const folders = await client.list()
        await client.logout()

        return {
          folders: folders.map((folder) => ({
            path: folder.path,
            messages: folder.status?.messages ?? null,
          })),
        }
      } catch (error) {
        client.close()
        throw new Error("imap_connection_failed", { cause: error })
      }
    },
  }
}
