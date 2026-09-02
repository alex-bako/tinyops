import { describe, expect, it } from "vitest"

import {
  createGoogleFormsApiConnector,
  createGoogleFormsManualCsvConnector,
} from "@/features/data-sources/google-forms-sync"
import type {
  GoogleFormsApiPort,
  GoogleFormsDataSource,
} from "@/features/data-sources/types"

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

describe("Google Forms live API sync connector", () => {
  type Page = Awaited<ReturnType<GoogleFormsApiPort["listResponses"]>>
  type ListInput = Parameters<GoogleFormsApiPort["listResponses"]>[0]

  const form = {
    formId: "1AbC_Def-1234567890",
    title: "Practice intake",
    collectsEmail: true,
    questions: [{ id: "q_goal", title: "What do you need?" }],
  }

  function response(id: string, time: string) {
    return {
      responseId: id,
      createTime: time,
      lastSubmittedTime: time,
      respondentEmail: "anna@example.com",
      answers: { q_goal: "Replay" },
    }
  }

  function api(pages: Record<string, Page>, calls: ListInput[]): GoogleFormsApiPort {
    return {
      serviceAccountEmail: "sync@tinyops.iam.gserviceaccount.com",
      async getForm() {
        return form
      },
      async listResponses(input) {
        calls.push(input)
        const page = pages[input.pageToken ?? "first"]
        if (!page) {
          throw Object.assign(new Error("google_forms_api_failed"), { status: 400 })
        }
        return page
      },
    }
  }

  function liveSource(cursor: Record<string, unknown> | null) {
    return source({
      connectionMode: "api",
      latestUpload: null,
      identityQuestionId: null,
      sync: { status: "running", cursor, lastError: null, lastSyncedAt: null },
    })
  }

  const input = { workspaceId: "workspace_1", sourceId: "forms_source_1", limit: 2 }

  it("walks every page before advancing the cursor, then filters by the newest submission", async () => {
    const calls: ListInput[] = []
    const pages: Record<string, Page> = {
      first: {
        responses: [
          response("resp-1", "2026-05-10T09:15:00.000Z"),
          response("resp-2", "2026-05-12T09:15:00.000Z"),
        ],
        nextPageToken: "page-2",
      },
      "page-2": {
        responses: [response("resp-3", "2026-05-11T09:15:00.000Z")],
        nextPageToken: null,
      },
    }

    const first = await createGoogleFormsApiConnector({
      source: liveSource(null),
      api: api(pages, calls),
    }).sync(input)

    expect(calls[0]).toEqual({
      formId: "1AbC_Def-1234567890",
      filter: undefined,
      pageSize: 2,
      pageToken: undefined,
    })
    expect(first).toMatchObject({
      truncated: true,
      cursor: {
        api: { since: null, pageToken: "page-2", maxSeen: "2026-05-12T09:15:00.000Z" },
      },
      diagnostics: { scanned: 2, accepted: 2 },
    })
    expect(first.records.map((record) => record.externalId)).toEqual([
      "forms:api:resp-1",
      "forms:api:resp-2",
    ])

    const second = await createGoogleFormsApiConnector({
      source: liveSource(first.cursor as Record<string, unknown>),
      api: api(pages, calls),
    }).sync(input)

    expect(calls[1]).toMatchObject({ filter: undefined, pageToken: "page-2" })
    expect(second).toMatchObject({
      truncated: false,
      cursor: { api: { since: "2026-05-12T09:15:00.000Z" } },
    })

    await createGoogleFormsApiConnector({
      source: liveSource(second.cursor as Record<string, unknown>),
      api: api({ first: { responses: [], nextPageToken: null } }, calls),
    }).sync(input)

    expect(calls[2]).toEqual({
      formId: "1AbC_Def-1234567890",
      filter: "timestamp > 2026-05-12T09:15:00.000Z",
      pageSize: 2,
      pageToken: undefined,
    })
  })

  it("restarts from the since cursor when a page token has expired", async () => {
    const calls: ListInput[] = []
    const result = await createGoogleFormsApiConnector({
      source: liveSource({
        api: {
          since: "2026-05-01T00:00:00.000Z",
          pageToken: "stale",
          maxSeen: "2026-05-02T00:00:00.000Z",
        },
      }),
      api: api(
        {
          first: {
            responses: [response("resp-9", "2026-05-03T00:00:00.000Z")],
            nextPageToken: null,
          },
        },
        calls
      ),
    }).sync(input)

    expect(calls.map((call) => call.pageToken)).toEqual(["stale", undefined])
    expect(calls[1]).toMatchObject({ filter: "timestamp > 2026-05-01T00:00:00.000Z" })
    expect(result).toMatchObject({
      truncated: false,
      cursor: { api: { since: "2026-05-03T00:00:00.000Z" } },
    })
  })
})
