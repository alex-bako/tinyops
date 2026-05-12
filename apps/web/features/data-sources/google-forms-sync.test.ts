import { describe, expect, it } from "vitest"

import { createGoogleFormsManualCsvConnector } from "@/features/data-sources/google-forms-sync"
import type { GoogleFormsDataSource } from "@/features/data-sources/types"

function source(
  patch: Partial<GoogleFormsDataSource> = {}
): GoogleFormsDataSource {
  return {
    id: "forms_source_1",
    workspaceId: "workspace_1",
    type: "forms",
    displayName: "Practice intake",
    status: "connected",
    configVersion: 1,
    externalFormId: "1AbC_Def-1234567890",
    connectionMode: "manual_csv",
    mapping: {
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    },
    latestUpload: {
      id: "upload_1",
      fileName: "practice-intake.csv",
      rowCount: 3,
      uploadedAt: "2026-05-10T00:00:00.000Z",
    },
    sync: {
      status: "queued",
      cursor: null,
      lastError: null,
      lastSyncedAt: null,
    },
    syncRuns: [],
    createdAt: "2026-05-10T00:00:00.000Z",
    updatedAt: "2026-05-10T00:00:00.000Z",
    ...patch,
    sourceSlug: patch.sourceSlug ?? "practice-intake",
  }
}

describe("Google Forms manual CSV sync connector", () => {
  it("syncs uploaded rows as form submissions and returns a bounded cursor", async () => {
    const calls: unknown[] = []
    const connector = createGoogleFormsManualCsvConnector({
      source: source(),
      rowReader: {
        async listManualCsvRows(input) {
          calls.push(input)
          return [
            {
              rowNumber: 2,
              responseKey: "manual_csv:1AbC_Def-1234567890:stored-anna",
              payload: {
                Timestamp: "2026-05-10T09:15:00.000Z",
                "Email Address": "anna@example.com",
                "Full name": "Anna Smith",
              },
            },
            {
              rowNumber: 3,
              responseKey:
                "manual_csv:1AbC_Def-1234567890:2026-05-10T10:15:00.000Z:priya@example.com",
              payload: {
                Timestamp: "2026-05-10T10:15:00.000Z",
                "Email Address": "priya@example.com",
                "Full name": "Priya Shah",
              },
            },
            {
              rowNumber: 4,
              responseKey:
                "manual_csv:1AbC_Def-1234567890:2026-05-10T11:15:00.000Z:mika@example.com",
              payload: {
                Timestamp: "2026-05-10T11:15:00.000Z",
                "Email Address": "mika@example.com",
                "Full name": "",
              },
            },
          ]
        },
      },
    })

    const result = await connector.sync({
      workspaceId: "workspace_1",
      sourceId: "forms_source_1",
      limit: 2,
    })

    expect(calls).toEqual([
      {
        workspaceId: "workspace_1",
        sourceId: "forms_source_1",
        uploadId: "upload_1",
        afterRowNumber: 0,
        limit: 3,
      },
    ])
    expect(result).toMatchObject({
      truncated: true,
      cursor: {
        manualCsv: {
          uploadId: "upload_1",
          lastRowNumber: 3,
        },
      },
      diagnostics: {
        uploadId: "upload_1",
        scanned: 3,
        accepted: 2,
      },
    })
    expect(result.records).toHaveLength(2)
    expect(result.records[0]).toMatchObject({
      sourceType: "forms",
      eventType: "form_submission",
      externalId: "forms:manual_csv:1AbC_Def-1234567890:stored-anna",
      participants: [{ email: "anna@example.com", role: "external" }],
    })
  })
})
