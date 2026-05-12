import { describe, expect, it } from "vitest"

import { createGoogleFormsSourceSyncAdapter } from "@/features/data-sources/adapters/google-forms-source-sync-adapter"
import type {
  DataSourceQueryPort,
  GoogleFormsDataSource,
} from "@/features/data-sources/types"

function source(): GoogleFormsDataSource {
  return {
    id: "forms_source_1",
    workspaceId: "workspace_1",
    type: "forms",
    displayName: "Practice intake",
    sourceSlug: "practice-intake",
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
      rowCount: 1,
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
  }
}

describe("Google Forms source sync adapter", () => {
  it("prepares a manual CSV connector for claimed forms jobs", async () => {
    const calls: unknown[] = []
    const reader: DataSourceQueryPort = {
      async listForWorkspace() {
        throw new Error("unexpected list")
      },
      async findBySlugForWorkspace() {
        throw new Error("unexpected find by slug")
      },
      async findByIdForWorkspace(input) {
        calls.push(input)
        return source()
      },
    }

    const adapter = createGoogleFormsSourceSyncAdapter({
      dataSourceReader: reader,
      rowReader: {
        async listManualCsvRows() {
          return []
        },
      },
    })

    const result = await adapter.prepare({
      job: {
        sourceId: "forms_source_1",
        workspaceId: "workspace_1",
        sourceType: "forms",
        leaseToken: "lease_1",
      },
    })

    expect(calls).toEqual([
      { workspaceId: "workspace_1", sourceId: "forms_source_1" },
    ])
    expect(result).toMatchObject({ ok: true })
    if (result.ok) {
      await expect(
        result.value.preview({
          workspaceId: "workspace_1",
          sourceId: "forms_source_1",
        })
      ).resolves.toMatchObject({ records: [], truncated: false })
    }
  })
})
