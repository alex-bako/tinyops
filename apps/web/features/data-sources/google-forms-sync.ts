import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
  ConnectorIngestionResult,
} from "@/features/clients/application/connector-ingestion"
import {
  buildGoogleFormsManualCsvRows,
  type GoogleFormsManualCsvStoredRow,
} from "@/features/data-sources/google-forms"
import type { GoogleFormsDataSource } from "@/features/data-sources/types"
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
