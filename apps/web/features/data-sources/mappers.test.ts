import { describe, expect, it } from "vitest"

import {
  mapDataSourceRow,
  type DataSourceRow,
} from "@/features/data-sources/mappers"

describe("data source row mapper", () => {
  it("maps Google Forms manual CSV rows from source config", () => {
    const row: DataSourceRow = {
      id: "forms_source_1",
      workspace_id: "workspace_1",
      source_type: "forms",
      slug: "practice-intake",
      display_name: "Practice intake",
      status: "connected",
      config_version: 1,
      config: {
        externalFormId: "1AbC_Def-1234567890",
        connectionMode: "manual_csv",
        mapping: {
          identityColumn: "Email Address",
          timestampColumn: "Timestamp",
        },
        latestUpload: {
          id: "upload_1",
          fileName: "practice-intake.csv",
          rowCount: 42,
          uploadedAt: "2026-05-10T00:00:00.000Z",
        },
      },
      created_at: "2026-05-10T00:00:00.000Z",
      updated_at: "2026-05-10T00:00:00.000Z",
      data_source_sync_states: {
        status: "idle",
        cursor: null,
        last_error: null,
        last_synced_at: "2026-05-10T00:10:00.000Z",
      },
      data_source_sync_runs: [],
    }

    expect(mapDataSourceRow(row)).toMatchObject({
      id: "forms_source_1",
      workspaceId: "workspace_1",
      type: "forms",
      sourceSlug: "practice-intake",
      displayName: "Practice intake",
      externalFormId: "1AbC_Def-1234567890",
      connectionMode: "manual_csv",
      mapping: {
        identityColumn: "Email Address",
        timestampColumn: "Timestamp",
      },
      latestUpload: {
        id: "upload_1",
        fileName: "practice-intake.csv",
        rowCount: 42,
      },
      sync: {
        status: "idle",
      },
    })
    expect(mapDataSourceRow(row).sync).not.toHaveProperty("historyWindow")
  })
})
