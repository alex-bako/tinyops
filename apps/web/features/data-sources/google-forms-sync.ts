import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
  ConnectorIngestionResult,
} from "@/features/clients/application/connector-ingestion"
import {
  buildGoogleFormsApiRecords,
  buildGoogleFormsManualCsvRows,
  type GoogleFormsManualCsvStoredRow,
} from "@/features/data-sources/google-forms"
import { googleFormsApiErrorStatus } from "@/features/data-sources/google-forms-api"
import type {
  GoogleFormsApiPort,
  GoogleFormsDataSource,
} from "@/features/data-sources/types"
import type { Json } from "@/lib/database.types"

export type GoogleFormsManualCsvRowReader = {
  listManualCsvRows(input: {
    workspaceId: string
    sourceId: string
    uploadId: string
    afterRowNumber: number
    limit: number
  }): Promise<GoogleFormsManualCsvStoredRow[]>
}

type ManualCsvCursor = {
  manualCsv?: {
    uploadId?: unknown
    lastRowNumber?: unknown
  }
}

export function createGoogleFormsManualCsvConnector({
  source,
  rowReader,
}: {
  source: GoogleFormsDataSource
  rowReader: GoogleFormsManualCsvRowReader
}): ConnectorIngestionPort {
  async function collect(
    input: ConnectorIngestionInput
  ): Promise<ConnectorIngestionResult> {
    const latestUpload = source.latestUpload
    if (!latestUpload) {
      return {
        records: [],
        truncated: false,
        cursor: (source.sync.cursor ?? undefined) as Json | undefined,
        diagnostics: { skipped: "missing_upload" },
      }
    }

    const limit = Math.max(1, input.limit ?? 50)
    const cursor = manualCsvCursor(source.sync.cursor as Json | null, latestUpload.id)
    const rows = await rowReader.listManualCsvRows({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      uploadId: latestUpload.id,
      afterRowNumber: cursor.lastRowNumber,
      limit: limit + 1,
    })
    const acceptedRows = rows.slice(0, limit)
    const normalizedRows = buildGoogleFormsManualCsvRows({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      source,
      rows: acceptedRows,
    })
    const lastRowNumber =
      acceptedRows.at(-1)?.rowNumber ?? cursor.lastRowNumber

    return {
      records: normalizedRows.map((row) => row.record),
      truncated: rows.length > acceptedRows.length,
      cursor: {
        manualCsv: {
          uploadId: latestUpload.id,
          lastRowNumber,
        },
      } satisfies Json,
      diagnostics: {
        uploadId: latestUpload.id,
        scanned: rows.length,
        accepted: acceptedRows.length,
      },
    }
  }

  return {
    preview: collect,
    sync: collect,
  }
}

function manualCsvCursor(cursor: Json | null, uploadId: string) {
  if (!cursor || typeof cursor !== "object" || Array.isArray(cursor)) {
    return { lastRowNumber: 0 }
  }
  const value = cursor as ManualCsvCursor
  const manualCsv = value.manualCsv
  if (!manualCsv || manualCsv.uploadId !== uploadId) {
    return { lastRowNumber: 0 }
  }
  const lastRowNumber = manualCsv.lastRowNumber
  return {
    lastRowNumber:
      typeof lastRowNumber === "number" && Number.isInteger(lastRowNumber)
        ? lastRowNumber
        : 0,
  }
}

// --- Live API connector ---------------------------------------------------

type ApiCursor = {
  api?: {
    since?: unknown
    pageToken?: unknown
    maxSeen?: unknown
  }
}

/**
 * Polls the Google Forms API for responses submitted (or edited) after the
 * stored `since` timestamp. Pages are walked with `pageToken` before `since`
 * advances, so unordered results cannot be skipped; re-fetched edits upsert
 * in place through the ingestion writer.
 */
export function createGoogleFormsApiConnector({
  source,
  api,
}: {
  source: GoogleFormsDataSource
  api: GoogleFormsApiPort
}): ConnectorIngestionPort {
  async function collect(
    input: ConnectorIngestionInput
  ): Promise<ConnectorIngestionResult> {
    const limit = Math.max(1, input.limit ?? 50)
    const cursor = apiCursor(source.sync.cursor as Json | null)
    const filter = cursor.since ? `timestamp > ${cursor.since}` : undefined
    const form = await api.getForm(source.externalFormId)
    const page = await listResponsePage({
      api,
      formId: source.externalFormId,
      filter,
      limit,
      pageToken: cursor.pageToken,
    })
    const records = buildGoogleFormsApiRecords({
      workspaceId: input.workspaceId,
      sourceId: input.sourceId,
      source,
      form,
      responses: page.responses,
    })
    const maxSeen = latestTimestamp([
      cursor.maxSeen,
      ...page.responses.map((response) => response.lastSubmittedTime),
    ])
    const hasMore = page.nextPageToken !== null

    return {
      records,
      truncated: hasMore,
      cursor: {
        api: hasMore
          ? {
              since: cursor.since,
              pageToken: page.nextPageToken,
              maxSeen,
            }
          : { since: maxSeen ?? cursor.since },
      } satisfies Json,
      diagnostics: {
        scanned: page.responses.length,
        accepted: records.length,
        since: cursor.since,
      },
    }
  }

  return {
    preview: collect,
    sync: collect,
  }
}

async function listResponsePage({
  api,
  formId,
  filter,
  limit,
  pageToken,
}: {
  api: GoogleFormsApiPort
  formId: string
  filter: string | undefined
  limit: number
  pageToken: string | null
}) {
  try {
    return await api.listResponses({
      formId,
      filter,
      pageSize: limit,
      pageToken: pageToken ?? undefined,
    })
  } catch (error) {
    // Expired page tokens come back as 400; restart the walk from `since`.
    // Re-fetched responses upsert, so restarting is safe.
    if (pageToken && googleFormsApiErrorStatus(error) === 400) {
      return api.listResponses({ formId, filter, pageSize: limit })
    }
    throw error
  }
}

function apiCursor(cursor: Json | null) {
  const value =
    cursor && typeof cursor === "object" && !Array.isArray(cursor)
      ? (cursor as ApiCursor).api
      : undefined
  return {
    since: optionalString(value?.since),
    pageToken: optionalString(value?.pageToken),
    maxSeen: optionalString(value?.maxSeen),
  }
}

function optionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null
}

function latestTimestamp(values: Array<string | null>): string | null {
  return values.reduce<string | null>((latest, value) => {
    const parsed = Date.parse(value ?? "")
    if (Number.isNaN(parsed)) return latest
    return latest && Date.parse(latest) >= parsed ? latest : value
  }, null)
}
