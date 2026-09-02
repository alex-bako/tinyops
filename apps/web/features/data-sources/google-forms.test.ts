import { describe, expect, it } from "vitest"

import {
  buildGoogleFormsApiRecords,
  buildGoogleFormsApiSourceConfig,
  buildGoogleFormsManualCsvRows,
  buildGoogleFormsManualCsvSourceConfig,
  buildGoogleFormsManualCsvUploadRows,
  extractGoogleFormId,
  parseGoogleFormsCsv,
} from "@/features/data-sources/google-forms"

describe("Google Forms manual CSV domain", () => {
  it("extracts a stable form id from pasted Google Forms URLs or raw ids", () => {
    expect(
      extractGoogleFormId(
        "https://docs.google.com/forms/d/e/1FAIpQLSctR_Form-Id_123/viewform"
      )
    ).toBe("1FAIpQLSctR_Form-Id_123")
    expect(
      extractGoogleFormId(
        "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit"
      )
    ).toBe("1AbC_Def-1234567890")
    expect(extractGoogleFormId(" 1AbC_Def-1234567890 ")).toBe(
      "1AbC_Def-1234567890"
    )
    expect(() => extractGoogleFormId("https://example.com/form")).toThrow(
      "invalid_google_form_id"
    )
  })

  it("parses Google Forms CSV exports with quoted answers and requires mapped identity and timestamp columns", () => {
    const csv = [
      "Timestamp,Email Address,Full name,What do you need?",
      '5/10/2026 09:15:00,anna@example.com,Anna Smith,"Replay, workbook"',
      '5/10/2026 10:30:00,priya@example.com,Priya Shah,"Line one',
      'line two"',
    ].join("\n")

    const parsed = parseGoogleFormsCsv(csv)

    expect(parsed.headers).toEqual([
      "Timestamp",
      "Email Address",
      "Full name",
      "What do you need?",
    ])
    expect(parsed.rows).toHaveLength(2)
    expect(parsed.rows[0]).toMatchObject({
      rowNumber: 2,
      values: {
        "Email Address": "anna@example.com",
        "What do you need?": "Replay, workbook",
      },
    })
    expect(parsed.rows[1]?.values["What do you need?"]).toBe("Line one\nline two")

    expect(() =>
      buildGoogleFormsManualCsvSourceConfig({
        formUrlOrId: "1AbC_Def-1234567890",
        displayName: "Practice intake",
        headers: parsed.headers,
        identityColumn: "Missing",
        timestampColumn: "Timestamp",
      })
    ).toThrow("invalid_google_forms_csv_mapping")
  })

  it("prepares manual CSV upload rows without client-derived response keys", () => {
    const parsed = parseGoogleFormsCsv(
      [
        "Timestamp,Email Address,Full name,What do you need?",
        '2026-05-10T09:15:00.000Z,anna@example.com,Anna Smith,"Replay, workbook"',
      ].join("\n")
    )
    const config = buildGoogleFormsManualCsvSourceConfig({
      formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      displayName: "Practice intake",
      headers: parsed.headers,
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    })

    expect(
      buildGoogleFormsManualCsvUploadRows({
        source: config,
        rows: parsed.rows,
      })
    ).toEqual([
      {
        rowNumber: 2,
        payload: {
          Timestamp: "2026-05-10T09:15:00.000Z",
          "Email Address": "anna@example.com",
          "Full name": "Anna Smith",
          "What do you need?": "Replay, workbook",
        },
      },
    ])
  })

  it("skips manual CSV upload rows when the optional identity column is blank or not an email", () => {
    const parsed = parseGoogleFormsCsv(
      [
        "Timestamp,Email Address,Full name",
        "2026-05-10T09:15:00.000Z,,Anonymous",
        "2026-05-10T09:20:00.000Z,Gábor,Named but no email",
        "2026-05-10T09:25:00.000Z,anna@example.com,Anna Smith",
      ].join("\n")
    )
    const config = buildGoogleFormsManualCsvSourceConfig({
      formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      displayName: "Practice intake",
      headers: parsed.headers,
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    })

    expect(
      buildGoogleFormsManualCsvUploadRows({
        source: config,
        rows: parsed.rows,
      })
    ).toEqual([
      {
        rowNumber: 4,
        payload: {
          Timestamp: "2026-05-10T09:25:00.000Z",
          "Email Address": "anna@example.com",
          "Full name": "Anna Smith",
        },
      },
    ])
  })

  it("rejects manual CSV uploads when no rows have a usable email identity", () => {
    const parsed = parseGoogleFormsCsv(
      [
        "Timestamp,Email Address,Full name",
        "2026-05-10T09:15:00.000Z,,Anonymous",
        "2026-05-10T09:20:00.000Z,Gábor,Named but no email",
      ].join("\n")
    )
    const config = buildGoogleFormsManualCsvSourceConfig({
      formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      displayName: "Practice intake",
      headers: parsed.headers,
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    })

    expect(() =>
      buildGoogleFormsManualCsvUploadRows({
        source: config,
        rows: parsed.rows,
      })
    ).toThrow("invalid_google_forms_csv_row")
  })

  it("normalizes stored CSV rows into form submission connector records from stored response identity", () => {
    const parsed = parseGoogleFormsCsv(
      [
        "Timestamp,Email Address,Full name,What do you need?",
        '2026-05-10T09:15:00.000Z,anna@example.com,Anna Smith,"Replay, workbook"',
      ].join("\n")
    )
    const config = buildGoogleFormsManualCsvSourceConfig({
      formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      displayName: "Practice intake",
      headers: parsed.headers,
      identityColumn: "Email Address",
      timestampColumn: "Timestamp",
    })

    const rows = buildGoogleFormsManualCsvRows({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      source: config,
      rows: [
        {
          rowNumber: 2,
          responseKey:
            "manual_csv:1AbC_Def-1234567890:stored-response-key",
          payload: parsed.rows[0]!.values,
        },
      ],
    })

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      rowNumber: 2,
      responseKey:
        "manual_csv:1AbC_Def-1234567890:stored-response-key",
      record: {
        workspaceId: "workspace_1",
        sourceId: "source_1",
        sourceType: "forms",
        externalId: "forms:manual_csv:1AbC_Def-1234567890:stored-response-key",
        recordType: "google_form_response",
        eventType: "form_submission",
        occurredAt: "2026-05-10T09:15:00.000Z",
        participants: [{ email: "anna@example.com", role: "external" }],
        metadata: {
          formTitle: "Practice intake",
        },
        body: {
          text: "Full name: Anna Smith\nWhat do you need?: Replay, workbook",
          blocks: [
            { kind: "qa", question: "Full name", answer: "Anna Smith" },
            {
              kind: "qa",
              question: "What do you need?",
              answer: "Replay, workbook",
            },
          ],
        },
        attributes: [
          { key: "Full name", value: "Anna Smith", confidence: 1 },
          { key: "What do you need?", value: "Replay, workbook", confidence: 1 },
        ],
      },
    })
    expect(JSON.stringify(rows[0])).not.toContain("Timestamp,Email Address")
  })

  it("normalizes dotted Google Forms timestamps without depending on the server timezone", () => {
    const parsed = parseGoogleFormsCsv(
      [
        "Időbélyeg,Email Address,Full name",
        "2026.01.14. 19:22:08,anna@example.com,Anna Smith",
      ].join("\n")
    )
    const config = buildGoogleFormsManualCsvSourceConfig({
      formUrlOrId: "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit",
      displayName: "Practice intake",
      headers: parsed.headers,
      identityColumn: "Email Address",
      timestampColumn: "Időbélyeg",
    })

    const rows = buildGoogleFormsManualCsvRows({
      workspaceId: "workspace_1",
      sourceId: "source_1",
      source: config,
      rows: [
        {
          rowNumber: 2,
          responseKey:
            "manual_csv:1AbC_Def-1234567890:stored-response-key",
          payload: parsed.rows[0]!.values,
        },
      ],
    })

    expect(rows[0]?.record.occurredAt).toBe("2026-01-14T19:22:08.000Z")
  })
})

describe("Google Forms live API domain", () => {
  const form = {
    formId: "1AbC_Def-1234567890",
    title: "Practice intake",
    collectsEmail: false,
    questions: [
      { id: "q_email", title: "Your email" },
      { id: "q_goal", title: "What do you need?" },
      { id: "q_blank", title: "" },
    ],
  }

  it("requires a resolvable client identity when building live source config", () => {
    const formUrl = "https://docs.google.com/forms/d/1AbC_Def-1234567890/edit"

    expect(() =>
      buildGoogleFormsApiSourceConfig({
        formId: formUrl,
        displayName: "Practice intake",
        identityQuestionId: null,
        form,
      })
    ).toThrow("invalid_google_forms_identity")
    expect(() =>
      buildGoogleFormsApiSourceConfig({
        formId: formUrl,
        displayName: "Practice intake",
        identityQuestionId: "q_missing",
        form,
      })
    ).toThrow("invalid_google_forms_identity")
    expect(() =>
      buildGoogleFormsApiSourceConfig({
        formId: formUrl,
        displayName: "  ",
        identityQuestionId: "q_email",
        form,
      })
    ).toThrow("invalid_data_source_name")

    expect(
      buildGoogleFormsApiSourceConfig({
        formId: formUrl,
        displayName: " Practice intake ",
        identityQuestionId: " q_email ",
        form,
      })
    ).toEqual({
      externalFormId: "1AbC_Def-1234567890",
      connectionMode: "api",
      displayName: "Practice intake",
      identityQuestionId: "q_email",
    })
    expect(
      buildGoogleFormsApiSourceConfig({
        formId: "1AbC_Def-1234567890",
        displayName: "Practice intake",
        identityQuestionId: undefined,
        form: { ...form, collectsEmail: true },
      })
    ).toMatchObject({ identityQuestionId: null })
  })

  it("normalizes live responses, preferring collected emails over the identity question", () => {
    const records = buildGoogleFormsApiRecords({
      workspaceId: "workspace_1",
      sourceId: "forms_source_1",
      source: {
        externalFormId: "1AbC_Def-1234567890",
        displayName: "Practice intake",
        identityQuestionId: "q_email",
      },
      form,
      responses: [
        {
          responseId: "resp-1",
          createTime: "2026-05-10T09:15:00.000Z",
          lastSubmittedTime: "2026-05-11T08:00:00.000Z",
          respondentEmail: "Collected@Example.com",
          answers: {
            q_email: "typed@example.com",
            q_goal: "Replay, workbook",
            q_blank: "yes",
          },
        },
        {
          responseId: "resp-2",
          createTime: "2026-05-10T10:15:00.000Z",
          lastSubmittedTime: "2026-05-10T10:15:00.000Z",
          respondentEmail: null,
          answers: { q_email: " Priya@Example.com " },
        },
        {
          responseId: "resp-3",
          createTime: "2026-05-10T11:15:00.000Z",
          lastSubmittedTime: "2026-05-10T11:15:00.000Z",
          respondentEmail: null,
          answers: { q_email: "not-an-email", q_goal: "Skip me" },
        },
      ],
    })

    expect(records).toHaveLength(2)
    expect(records[0]).toMatchObject({
      workspaceId: "workspace_1",
      sourceId: "forms_source_1",
      sourceType: "forms",
      externalId: "forms:api:resp-1",
      recordType: "google_form_response",
      eventType: "form_submission",
      occurredAt: "2026-05-10T09:15:00.000Z",
      participants: [{ email: "collected@example.com", role: "external" }],
      body: {
        blocks: [
          { kind: "qa", question: "What do you need?", answer: "Replay, workbook" },
          { kind: "qa", question: "Question q_blank", answer: "yes" },
        ],
      },
      metadata: {
        externalFormId: "1AbC_Def-1234567890",
        formTitle: "Practice intake",
        connectionMode: "api",
        responseId: "resp-1",
        lastSubmittedTime: "2026-05-11T08:00:00.000Z",
      },
      attributes: [
        { key: "What do you need?", value: "Replay, workbook", confidence: 1 },
        { key: "Question q_blank", value: "yes", confidence: 1 },
      ],
      sensitivityLevel: 0,
    })
    expect(records[1]).toMatchObject({
      externalId: "forms:api:resp-2",
      participants: [{ email: "priya@example.com", role: "external" }],
      body: { text: "", blocks: [] },
      attributes: [],
    })
  })
})
