import { describe, expect, it } from "vitest"

import {
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
        title: "Practice intake response",
        participants: [{ email: "anna@example.com", role: "external" }],
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
