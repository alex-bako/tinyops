import Papa from "papaparse"

import type { NormalizedConnectorRecord } from "@/features/clients/domain/connector-record"
import type { Json } from "@/lib/database.types"

export const GOOGLE_FORMS_CONNECTION_MODES = [
  "manual_csv",
] as const

export type GoogleFormsConnectionMode =
  (typeof GOOGLE_FORMS_CONNECTION_MODES)[number]

export type GoogleFormsManualCsvMapping = {
  identityColumn: string
  timestampColumn: string
}

export type GoogleFormsSourceConfig = {
  externalFormId: string
  connectionMode: GoogleFormsConnectionMode
  displayName: string
  mapping: GoogleFormsManualCsvMapping
}

export type GoogleFormsCsvRow = {
  rowNumber: number
  values: Record<string, string>
}

export type GoogleFormsParsedCsv = {
  headers: string[]
  rows: GoogleFormsCsvRow[]
}

export type GoogleFormsManualCsvConnectorRow = {
  rowNumber: number
  responseKey: string
  payload: Record<string, string>
  record: NormalizedConnectorRecord
}

export type GoogleFormsManualCsvUploadRow = {
  rowNumber: number
  payload: Record<string, string>
}

export type GoogleFormsManualCsvStoredRow = GoogleFormsManualCsvUploadRow & {
  responseKey: string
}

const RAW_ID_PATTERN = /^[A-Za-z0-9_-]{10,}$/
const GOOGLE_FORMS_URL_ID_PATTERN = /\/forms\/d\/(?:e\/)?([A-Za-z0-9_-]+)/
const DOTTED_TIMESTAMP_PATTERN =
  /^(\d{4})\.(\d{1,2})\.(\d{1,2})\.?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?$/

export function extractGoogleFormId(input: string): string {
  const value = input.trim()
  if (RAW_ID_PATTERN.test(value)) return value

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error("invalid_google_form_id")
  }

  if (url.hostname !== "docs.google.com") {
    throw new Error("invalid_google_form_id")
  }

  const match = url.pathname.match(GOOGLE_FORMS_URL_ID_PATTERN)
  const formId = match?.[1]?.trim()
  if (!formId || !RAW_ID_PATTERN.test(formId)) {
    throw new Error("invalid_google_form_id")
  }
  return formId
}

export function parseGoogleFormsCsv(csvText: string): GoogleFormsParsedCsv {
  const result = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })
  if (result.errors.length > 0) throw new Error("invalid_google_forms_csv")

  const headers = (result.meta.fields ?? [])
    .map((header) => header.trim())
    .filter(Boolean)
  if (headers.length === 0) throw new Error("invalid_google_forms_csv")

  const rows = result.data
    .map((values, index) => ({
      rowNumber: index + 2,
      values: normalizeCsvRow(headers, values),
    }))
    .filter((row) =>
      Object.values(row.values).some((value) => value.trim().length > 0)
    )

  if (rows.length === 0) throw new Error("invalid_google_forms_csv")
  return { headers, rows }
}

export function buildGoogleFormsManualCsvSourceConfig({
  formUrlOrId,
  displayName,
  headers,
  identityColumn,
  timestampColumn,
}: {
  formUrlOrId: string
  displayName: string
  headers: string[]
  identityColumn: string
  timestampColumn: string
}): GoogleFormsSourceConfig {
  const mapping = normalizeMapping({
    headers,
    identityColumn,
    timestampColumn,
  })

  return {
    externalFormId: extractGoogleFormId(formUrlOrId),
    connectionMode: "manual_csv",
    displayName: displayName.trim() || "Google Form",
    mapping,
  }
}

export function buildGoogleFormsManualCsvRows({
  workspaceId,
  sourceId,
  source,
  rows,
}: {
  workspaceId: string
  sourceId: string
  source: GoogleFormsSourceConfig
  rows: GoogleFormsManualCsvStoredRow[]
}): GoogleFormsManualCsvConnectorRow[] {
  return rows.map((row) =>
    normalizeManualCsvConnectorRow({
      workspaceId,
      sourceId,
      source,
      row,
    })
  )
}

export function buildGoogleFormsManualCsvUploadRows({
  source,
  rows,
}: {
  source: GoogleFormsSourceConfig
  rows: GoogleFormsCsvRow[]
}): GoogleFormsManualCsvUploadRow[] {
  const uploadRows = rows
    .filter((row) => isValidEmail(row.values[source.mapping.identityColumn]))
    .map((row) => ({
      rowNumber: row.rowNumber,
      payload: row.values,
    }))
  if (uploadRows.length === 0) throw new Error("invalid_google_forms_csv_row")
  return uploadRows
}

function normalizeManualCsvConnectorRow({
  workspaceId,
  sourceId,
  source,
  row,
}: {
  workspaceId: string
  sourceId: string
  source: GoogleFormsSourceConfig
  row: GoogleFormsManualCsvStoredRow
}): GoogleFormsManualCsvConnectorRow {
  const email = requiredEmail(row.payload[source.mapping.identityColumn])
  const occurredAt = requiredTimestamp(row.payload[source.mapping.timestampColumn])
  const responseKey = requiredResponseKey(row.responseKey)
  const attributes = Object.entries(row.payload)
    .filter(([key]) => key !== source.mapping.identityColumn)
    .filter(([key]) => key !== source.mapping.timestampColumn)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => ({
      key,
      value: value as Json,
      confidence: 1,
    }))

  return {
    rowNumber: row.rowNumber,
    responseKey,
    payload: row.payload,
    record: {
      workspaceId,
      sourceId,
      sourceType: "forms",
      externalId: googleFormsManualCsvRecordExternalId(responseKey),
      recordType: "google_form_response",
      eventType: "form_submission",
      occurredAt,
      title: `${source.displayName} response`,
      summary: `${source.displayName} response from ${email}`,
      bodyText: formResponseBodyText(row.payload),
      participants: [{ email, role: "external" }],
      metadata: {
        externalFormId: source.externalFormId,
        connectionMode: source.connectionMode,
        rowNumber: row.rowNumber,
        responseKey,
      },
      attributes,
      sensitivityLevel: 0,
    },
  }
}

export function googleFormsManualCsvRecordExternalId(responseKey: string) {
  return `forms:${requiredResponseKey(responseKey)}`
}

function normalizeMapping({
  headers,
  identityColumn,
  timestampColumn,
}: {
  headers: string[]
  identityColumn: string
  timestampColumn: string
}): GoogleFormsManualCsvMapping {
  const headerSet = new Set(headers)
  const normalizedIdentity = identityColumn.trim()
  const normalizedTimestamp = timestampColumn.trim()
  if (
    !normalizedIdentity ||
    !normalizedTimestamp ||
    normalizedIdentity === normalizedTimestamp ||
    !headerSet.has(normalizedIdentity) ||
    !headerSet.has(normalizedTimestamp)
  ) {
    throw new Error("invalid_google_forms_csv_mapping")
  }
  return {
    identityColumn: normalizedIdentity,
    timestampColumn: normalizedTimestamp,
  }
}

function normalizeCsvRow(
  headers: string[],
  values: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    headers.map((header) => [header, String(values[header] ?? "").trim()])
  )
}

function requiredEmail(value: string | undefined): string {
  const email = (value ?? "").trim().toLowerCase()
  if (!isValidEmail(email)) {
    throw new Error("invalid_google_forms_csv_row")
  }
  return email
}

function isValidEmail(value: string | undefined): boolean {
  const email = (value ?? "").trim()
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)
}

function requiredResponseKey(value: string): string {
  const responseKey = value.trim()
  if (!responseKey) throw new Error("invalid_google_forms_csv_row")
  return responseKey
}

function requiredTimestamp(value: string | undefined): string {
  const timestamp = (value ?? "").trim()
  const parsed = parseDottedGoogleFormsTimestamp(timestamp) ?? Date.parse(timestamp)
  if (Number.isNaN(parsed)) throw new Error("invalid_google_forms_csv_row")
  return new Date(parsed).toISOString()
}

function parseDottedGoogleFormsTimestamp(value: string): number | null {
  const match = value.match(DOTTED_TIMESTAMP_PATTERN)
  if (!match) return null

  const [, yearValue, monthValue, dayValue, hourValue, minuteValue, secondValue] =
    match
  const year = Number(yearValue)
  const month = Number(monthValue)
  const day = Number(dayValue)
  const hour = Number(hourValue)
  const minute = Number(minuteValue)
  const second = Number(secondValue ?? "0")
  const parsed = Date.UTC(year, month - 1, day, hour, minute, second)
  const parsedDate = new Date(parsed)

  if (
    parsedDate.getUTCFullYear() !== year ||
    parsedDate.getUTCMonth() !== month - 1 ||
    parsedDate.getUTCDate() !== day ||
    parsedDate.getUTCHours() !== hour ||
    parsedDate.getUTCMinutes() !== minute ||
    parsedDate.getUTCSeconds() !== second
  ) {
    return null
  }

  return parsed
}

function formResponseBodyText(values: Record<string, string>) {
  return Object.entries(values)
    .filter(([, value]) => value.trim().length > 0)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n")
}
