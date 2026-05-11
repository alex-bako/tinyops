import type { GoogleFormsManualCsvStoredRow } from "@/features/data-sources/google-forms"
import type { GoogleFormsManualCsvRowReader } from "@/features/data-sources/google-forms-sync"
import type { Json } from "@/lib/database.types"

type GoogleFormsCsvRowRecord = {
  row_number: unknown
  response_key: unknown
  payload: unknown
}

type QueryResult = PromiseLike<{
  data: GoogleFormsCsvRowRecord[] | null
  error: { message: string } | null
}>

export type SupabaseGoogleFormsManualCsvRowReaderClient = {
  from(table: "google_forms_csv_rows"): {
    select(columns: string): {
      eq(column: string, value: unknown): {
        eq(column: string, value: unknown): {
          eq(column: string, value: unknown): {
            gt(column: string, value: unknown): {
              order(column: string, options: { ascending: boolean }): {
                limit(count: number): QueryResult
              }
            }
          }
        }
      }
    }
  }
}

export function createSupabaseGoogleFormsManualCsvRowReader({
  client,
}: {
  client: SupabaseGoogleFormsManualCsvRowReaderClient
}): GoogleFormsManualCsvRowReader {
  return {
    async listManualCsvRows(input) {
      const { data, error } = await client
        .from("google_forms_csv_rows")
        .select("row_number, response_key, payload")
        .eq("workspace_id", input.workspaceId)
        .eq("source_id", input.sourceId)
        .eq("upload_id", input.uploadId)
        .gt("row_number", input.afterRowNumber)
        .order("row_number", { ascending: true })
        .limit(input.limit)

      if (error) {
        throw new Error("google_forms_csv_rows_read_failed", { cause: error })
      }

      return (data ?? []).map(mapRow).filter(isUploadRow)
    },
  }
}

function mapRow(row: GoogleFormsCsvRowRecord): GoogleFormsManualCsvStoredRow | null {
  if (
    typeof row.row_number !== "number" ||
    !Number.isInteger(row.row_number) ||
    typeof row.response_key !== "string" ||
    !row.payload ||
    typeof row.payload !== "object" ||
    Array.isArray(row.payload)
  ) {
    return null
  }

  return {
    rowNumber: row.row_number,
    responseKey: row.response_key,
    payload: Object.fromEntries(
      Object.entries(row.payload as Record<string, Json>).map(([key, value]) => [
        key,
        typeof value === "string" ? value : String(value ?? ""),
      ])
    ),
  }
}

function isUploadRow(
  row: GoogleFormsManualCsvStoredRow | null
): row is GoogleFormsManualCsvStoredRow {
  return row !== null
}
