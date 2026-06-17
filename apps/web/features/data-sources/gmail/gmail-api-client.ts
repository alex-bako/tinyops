import { google } from "googleapis"

/**
 * Library-agnostic Gmail API port. The connector, probe, and credential reader
 * depend only on this interface so they can be unit-tested with an in-memory
 * fake; the `googleapis` SDK is confined to `createGoogleGmailApiClient`.
 */

export type GmailProfile = {
  emailAddress: string
  historyId: string | null
}

export type GmailLabel = {
  id: string
  name: string
  type: string | null
  messagesTotal: number | null
}

export type GmailMessageRef = {
  id: string
  threadId: string | null
}

export type GmailMessageListPage = {
  messages: GmailMessageRef[]
  nextPageToken: string | null
  resultSizeEstimate: number | null
}

export type GmailRawMessage = {
  id: string
  threadId: string | null
  labelIds: string[]
  internalDate: string | null
  /** base64url-encoded RFC822 message. */
  raw: string
}

export type GmailHistoryPage = {
  addedMessageIds: string[]
  nextPageToken: string | null
  historyId: string | null
}

export type GmailApiClient = {
  getProfile(): Promise<GmailProfile>
  listLabels(): Promise<GmailLabel[]>
  listMessages(input: {
    labelIds?: string[]
    q?: string
    pageToken?: string
    maxResults?: number
  }): Promise<GmailMessageListPage>
  getMessageRaw(id: string): Promise<GmailRawMessage>
  listHistory(input: {
    startHistoryId: string
    pageToken?: string
    labelId?: string
  }): Promise<GmailHistoryPage>
}

export function createGoogleGmailApiClient({
  accessToken,
}: {
  accessToken: string
}): GmailApiClient {
  const auth = new google.auth.OAuth2()
  auth.setCredentials({ access_token: accessToken })
  const gmail = google.gmail({ version: "v1", auth })

  return {
    async getProfile() {
      const { data } = await gmail.users.getProfile({ userId: "me" })
      return {
        emailAddress: data.emailAddress ?? "",
        historyId: data.historyId ?? null,
      }
    },

    async listLabels() {
      const { data } = await gmail.users.labels.list({ userId: "me" })
      return (data.labels ?? []).flatMap((label) =>
        label.id && label.name
          ? [
              {
                id: label.id,
                name: label.name,
                type: label.type ?? null,
                messagesTotal: label.messagesTotal ?? null,
              },
            ]
          : []
      )
    },

    async listMessages({ labelIds, q, pageToken, maxResults }) {
      const { data } = await gmail.users.messages.list({
        userId: "me",
        labelIds,
        q,
        pageToken,
        maxResults,
      })
      return {
        messages: (data.messages ?? []).flatMap((message) =>
          message.id
            ? [{ id: message.id, threadId: message.threadId ?? null }]
            : []
        ),
        nextPageToken: data.nextPageToken ?? null,
        resultSizeEstimate: data.resultSizeEstimate ?? null,
      }
    },

    async getMessageRaw(id) {
      const { data } = await gmail.users.messages.get({
        userId: "me",
        id,
        format: "raw",
      })
      return {
        id: data.id ?? id,
        threadId: data.threadId ?? null,
        labelIds: data.labelIds ?? [],
        internalDate: data.internalDate ?? null,
        raw: data.raw ?? "",
      }
    },

    async listHistory({ startHistoryId, pageToken, labelId }) {
      const { data } = await gmail.users.history.list({
        userId: "me",
        startHistoryId,
        pageToken,
        labelId,
        historyTypes: ["messageAdded"],
      })
      const addedMessageIds = (data.history ?? []).flatMap((entry) =>
        (entry.messagesAdded ?? []).flatMap((added) =>
          added.message?.id ? [added.message.id] : []
        )
      )
      return {
        addedMessageIds: Array.from(new Set(addedMessageIds)),
        nextPageToken: data.nextPageToken ?? null,
        historyId: data.historyId ?? null,
      }
    },
  }
}

/** Gmail returns 404 from history.list when startHistoryId has expired. */
export function isGmailHistoryExpiredError(error: unknown): boolean {
  return gmailErrorStatus(error) === 404
}

/** Rate limiting (429) or userRateLimitExceeded/rateLimitExceeded (403). */
export function isGmailRateLimitError(error: unknown): boolean {
  const status = gmailErrorStatus(error)
  if (status === 429) return true
  if (status !== 403) return false
  const reason = gmailErrorReason(error)
  return reason === "rateLimitExceeded" || reason === "userRateLimitExceeded"
}

/** invalid_grant / 401 — the stored refresh token is no longer usable. */
export function isGmailAuthError(error: unknown): boolean {
  if (gmailErrorStatus(error) === 401) return true
  const message =
    error instanceof Error ? error.message : String(error ?? "")
  return /invalid_grant/i.test(message)
}

function gmailErrorStatus(error: unknown): number | null {
  if (typeof error !== "object" || error === null) return null
  const record = error as {
    code?: unknown
    status?: unknown
    response?: { status?: unknown }
  }
  const candidate = record.response?.status ?? record.status ?? record.code
  return typeof candidate === "number" ? candidate : null
}

function gmailErrorReason(error: unknown): string | null {
  if (typeof error !== "object" || error === null) return null
  const errors = (
    error as { errors?: Array<{ reason?: unknown }> }
  ).errors
  const reason = Array.isArray(errors) ? errors[0]?.reason : undefined
  return typeof reason === "string" ? reason : null
}
