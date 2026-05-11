import { describe, expect, it } from "vitest"

import { createSupabaseGoogleFormsManualCsvRowReader } from "@/features/data-sources/google-forms-row-reader"

describe("Supabase Google Forms row reader", () => {
  it("loads manual CSV rows after the cursor for one upload", async () => {
    const calls: unknown[] = []
    const client = {
      from(table: string) {
        calls.push({ method: "from", table })
        return {
          select(columns: string) {
            calls.push({ method: "select", columns })
            return this
          },
          eq(column: string, value: unknown) {
            calls.push({ method: "eq", column, value })
            return this
          },
          gt(column: string, value: unknown) {
            calls.push({ method: "gt", column, value })
            return this
          },
          order(column: string, options: unknown) {
            calls.push({ method: "order", column, options })
            return this
          },
          limit(count: number) {
            calls.push({ method: "limit", count })
            return Promise.resolve({
              data: [
                {
                  row_number: 3,
                  response_key:
                    "manual_csv:1AbC_Def-1234567890:2026-05-10T10:15:00.000Z:priya@example.com",
                  payload: {
                    Timestamp: "2026-05-10T10:15:00.000Z",
                    "Email Address": "priya@example.com",
                  },
                },
              ],
              error: null,
            })
          },
        }
      },
    }

    const reader = createSupabaseGoogleFormsManualCsvRowReader({
      client: client as never,
    })

    await expect(
      reader.listManualCsvRows({
        workspaceId: "workspace_1",
        sourceId: "forms_source_1",
        uploadId: "upload_1",
        afterRowNumber: 2,
        limit: 10,
      })
    ).resolves.toEqual([
      {
        rowNumber: 3,
        responseKey:
          "manual_csv:1AbC_Def-1234567890:2026-05-10T10:15:00.000Z:priya@example.com",
        payload: {
          Timestamp: "2026-05-10T10:15:00.000Z",
          "Email Address": "priya@example.com",
        },
      },
    ])
    expect(calls).toEqual([
      { method: "from", table: "google_forms_csv_rows" },
      { method: "select", columns: "row_number, response_key, payload" },
      { method: "eq", column: "workspace_id", value: "workspace_1" },
      { method: "eq", column: "source_id", value: "forms_source_1" },
      { method: "eq", column: "upload_id", value: "upload_1" },
      { method: "gt", column: "row_number", value: 2 },
      { method: "order", column: "row_number", options: { ascending: true } },
      { method: "limit", count: 10 },
    ])
  })
})
