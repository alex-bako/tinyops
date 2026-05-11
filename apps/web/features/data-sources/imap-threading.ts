import type { ImapFolder } from "@/features/data-sources/types"

export type ImapThreadHeadersInput = {
  messageId?: string | null
  inReplyTo?: string | string[] | null
  references?: string | string[] | null
}

export type ImapThreadHeaders = {
  messageId: string | null
  inReplyTo: string | null
  references: string[]
  linkedMessageIds: string[]
  relatedMessageIds: string[]
  threadKey: string | null
}

export type ImapThreadIndexSnapshot = {
  messageIds: string[]
}

export type ImapThreadIndexReader = {
  read(input: {
    workspaceId: string
    sourceId: string
  }): Promise<ImapThreadIndexSnapshot>
}

export function buildImapThreadHeaders(
  input: ImapThreadHeadersInput
): ImapThreadHeaders {
  const messageId = normalizeMessageId(input.messageId)
  const inReplyTo = firstMessageId(input.inReplyTo)
  const references = messageIdList(input.references)
  const linkedMessageIds = uniqueIds([inReplyTo, ...references])
  const relatedMessageIds = uniqueIds([messageId, ...linkedMessageIds])

  return {
    messageId,
    inReplyTo,
    references,
    linkedMessageIds,
    relatedMessageIds,
    threadKey: references[0] ?? inReplyTo ?? messageId,
  }
}

export function createImapThreadIndex(seedMessageIds: string[] = []) {
  const anchoredMessageIds = new Set(
    seedMessageIds.flatMap((value) => {
      const normalized = normalizeMessageId(value)
      return normalized ? [normalized] : []
    })
  )

  return {
    anchor(headers: ImapThreadHeaders) {
      for (const id of headers.relatedMessageIds) {
        anchoredMessageIds.add(id)
      }
    },
    isLinked(headers: ImapThreadHeaders) {
      return headers.linkedMessageIds.some((id) => anchoredMessageIds.has(id))
    },
    ids() {
      return [...anchoredMessageIds]
    },
  }
}

export function detectSentFolders(folders: ImapFolder[]) {
  const sent = folders.filter(isSentFolder).map((folder) => folder.path)
  return Array.from(new Set(sent))
}

export function normalizeMessageId(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim().replace(/\s+/g, "")
  if (!trimmed) return null
  return trimmed.toLowerCase()
}

function firstMessageId(value: string | string[] | null | undefined) {
  return messageIdList(value)[0] ?? null
}

function messageIdList(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : []
  return uniqueIds(values.flatMap(extractMessageIds))
}

function extractMessageIds(value: string) {
  const matches = value.match(/<[^<>]+>/g)
  const candidates = matches && matches.length > 0 ? matches : [value]
  return candidates.flatMap((candidate) => {
    const normalized = normalizeMessageId(candidate)
    return normalized ? [normalized] : []
  })
}

function uniqueIds(values: Array<string | null | undefined>) {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value)))
  )
}

function isSentFolder(folder: ImapFolder) {
  const specialUse = folder.specialUse?.toLowerCase()
  if (specialUse === "\\sent") return true
  if (folder.flags?.some((flag) => flag.toLowerCase() === "\\sent")) return true

  const normalizedPath = folder.path.toLowerCase()
  const lastSegment = normalizedPath.split(/[\\/]/).pop() ?? normalizedPath
  return (
    lastSegment === "sent" ||
    lastSegment === "sent mail" ||
    lastSegment === "sent items" ||
    normalizedPath.endsWith("/sent mail") ||
    normalizedPath.endsWith("\\sent mail")
  )
}
