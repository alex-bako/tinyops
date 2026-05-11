import { ImapFlow } from "imapflow"

import type {
  ImapConnectionTestInput,
  ImapConnectionTester,
} from "@/features/data-sources/types"

type ImapFlowConstructor = new (options: {
  host: string
  port: number
  secure: boolean
  doSTARTTLS: boolean
  auth: { user: string; pass: string }
  logger: false
}) => {
  connect(): Promise<void>
  list(options?: unknown): Promise<
    Array<{
      path: string
      specialUse?: string | null
      flags?: Iterable<string> | null
      status?: { messages?: number | null } | null
    }>
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
        doSTARTTLS: input.encryption === "starttls",
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
            ...(folder.specialUse ? { specialUse: folder.specialUse } : {}),
            ...(folder.flags
              ? {
                  flags: Array.from(folder.flags)
                    .map((flag) => flag.trim())
                    .filter(Boolean),
                }
              : {}),
          })),
        }
      } catch (error) {
        client.close()
        throw new Error("imap_connection_failed", { cause: error })
      }
    },
  }
}
