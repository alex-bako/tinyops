import { ImapFlow } from "imapflow"

import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
} from "@/features/clients/application/connector-ingestion"
import type { ImapRecipientLookup } from "@/features/data-sources/imap-recipient-lookup"
import { ownerEmailSet } from "@/features/data-sources/imap-message-facts"
import {
  createImapThreadedSync,
  type ImapSyncClient,
} from "@/features/data-sources/imap-threaded-sync"
import type { ImapThreadIndexReader } from "@/features/data-sources/imap-threading"
import type { ImapDataSource } from "@/features/data-sources/types"
import { createNoopLogger, type LoggerPort } from "@/lib/logging"

type ImapFlowConstructor = new (options: {
  host: string
  port: number
  secure: boolean
  doSTARTTLS: boolean
  auth: { user: string; pass: string }
  logger: false
}) => ImapSyncClient

export function createImapConnector({
  source,
  password,
  ownerEmails,
  manualReviewKeywords,
  threadIndexReader,
  recipientLookup,
  ImapFlow: ImapFlowClient = ImapFlow as ImapFlowConstructor,
  now = new Date(),
  logger = createNoopLogger(),
}: {
  source: ImapDataSource
  password: string
  ownerEmails: string[]
  manualReviewKeywords: string[]
  threadIndexReader?: ImapThreadIndexReader
  recipientLookup?: ImapRecipientLookup
  ImapFlow?: ImapFlowConstructor
  now?: Date
  logger?: LoggerPort
}): ConnectorIngestionPort {
  async function collect(input: ConnectorIngestionInput, preview: boolean) {
    const syncLogger = logger.child({
      component: "imap_sync",
      sourceId: source.id,
      workspaceId: source.workspaceId,
      preview,
    })
    const client = new ImapFlowClient({
      host: source.connection.host,
      port: source.connection.port,
      secure: source.connection.encryption === "ssl",
      doSTARTTLS: source.connection.encryption === "starttls",
      auth: {
        user: source.connection.username,
        pass: password,
      },
      logger: false,
    })

    let connected = false
    try {
      syncLogger.debug({ event: "imap.connection.open" }, "opening IMAP connection")
      await client.connect()
      connected = true
      const threadedSync = createImapThreadedSync({
        client,
        source,
        ownerEmails: ownerEmailSet(source.connection.username, ownerEmails),
        manualReviewKeywords,
        threadIndexReader,
        recipientLookup,
        now,
        logger: syncLogger,
      })
      const result = preview
        ? await threadedSync.preview(input)
        : await threadedSync.sync(input)
      await client.logout()
      return result
    } catch (error) {
      client.close()
      if (!connected) throw new Error("imap_connection_failed", { cause: error })
      throw error
    }
  }

  return {
    preview(input) {
      return collect(input, true)
    },
    sync(input) {
      return collect(input, false)
    },
  }
}
