import Papa from "papaparse"

import type { NormalizedConnectorRecord } from "@/features/clients/domain/connector-record"
import { createQaTimelineEventBody } from "@/features/clients/domain/timeline-event-body"
import type { Json } from "@/lib/database.types"

export const GOOGLE_FORMS_CONNECTION_MODES = ["manual_csv", "api"] as const

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

  const headers = (result.meta.fields ?? []).flatMap((header) => {
    const trimmed = header.trim()
    return trimmed ? [trimmed] : []
  })
  if (headers.length === 0) throw new Error("invalid_google_forms_csv")

  const rows = result.data.flatMap((values, index) => {
    const row = {
      rowNumber: index + 2,
      values: normalizeCsvRow(headers, values),
    }
    return Object.values(row.values).some((value) => value.trim().length > 0)
      ? [row]
      : []
  })

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
  const normalizedDisplayName = displayName.trim()
  if (!normalizedDisplayName) throw new Error("invalid_data_source_name")
  const mapping = normalizeMapping({
    headers,
    identityColumn,
    timestampColumn,
  })

  return {
    externalFormId: extractGoogleFormId(formUrlOrId),
    connectionMode: "manual_csv",
    displayName: normalizedDisplayName,
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
  const uploadRows = rows.flatMap((row) =>
    isValidEmail(row.values[source.mapping.identityColumn])
      ? [
          {
            rowNumber: row.rowNumber,
            payload: row.values,
          },
        ]
      : []
  )
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
  const occurredAt = requiredTimestamp(
    row.payload[source.mapping.timestampColumn]
  )
  const responseKey = requiredResponseKey(row.responseKey)
  const attributes = Object.entries(row.payload).flatMap(([key, value]) =>
    key !== source.mapping.identityColumn &&
    key !== source.mapping.timestampColumn &&
    value.trim().length > 0
      ? [
          {
            key,
            value: value as Json,
            confidence: 1,
          },
        ]
      : []
  )

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
      body: formResponseBody(row.payload, source.mapping),
      participants: [{ email, role: "external" }],
      metadata: {
        externalFormId: source.externalFormId,
        formTitle: source.displayName,
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
  const parsed =
    parseDottedGoogleFormsTimestamp(timestamp) ?? Date.parse(timestamp)
  if (Number.isNaN(parsed)) throw new Error("invalid_google_forms_csv_row")
  return new Date(parsed).toISOString()
}

function parseDottedGoogleFormsTimestamp(value: string): number | null {
  const match = value.match(DOTTED_TIMESTAMP_PATTERN)
  if (!match) return null

  const [
    ,
    yearValue,
    monthValue,
    dayValue,
    hourValue,
    minuteValue,
    secondValue,
  ] = match
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

function formResponseBody(
  values: Record<string, string>,
  mapping: GoogleFormsManualCsvMapping
) {
  return createQaTimelineEventBody(
    Object.entries(values).flatMap(([key, value]) =>
      key !== mapping.identityColumn &&
      key !== mapping.timestampColumn &&
      value.trim().length > 0
        ? [{ question: key, answer: value }]
        : []
    )
  )
}

// --- Live API mode (service account) -------------------------------------

export type GoogleFormsApiQuestion = {
  id: string
  title: string
}

export type GoogleFormsApiForm = {
  formId: string
  title: string
  collectsEmail: boolean
  questions: GoogleFormsApiQuestion[]
}

export type GoogleFormsApiResponse = {
  responseId: string
  createTime: string
  lastSubmittedTime: string
  respondentEmail: string | null
  /** questionId -> flattened answer text (file uploads already rendered as links). */
  answers: Record<string, string>
}

export type GoogleFormsApiSourceConfig = {
  externalFormId: string
  connectionMode: "api"
  displayName: string
  /** Question used as the client email when the form does not collect emails. */
  identityQuestionId: string | null
}

export function buildGoogleFormsApiSourceConfig({
  formId,
  displayName,
  identityQuestionId,
  form,
}: {
  formId: string
  displayName: string
  identityQuestionId: string | null | undefined
  form: Pick<GoogleFormsApiForm, "collectsEmail" | "questions">
}): GoogleFormsApiSourceConfig {
  const normalizedDisplayName = displayName.trim()
  if (!normalizedDisplayName) throw new Error("invalid_data_source_name")

  const questionId = identityQuestionId?.trim() || null
  if (questionId && !form.questions.some((question) => question.id === questionId)) {
    throw new Error("invalid_google_forms_identity")
  }
  if (!questionId && !form.collectsEmail) {
    throw new Error("invalid_google_forms_identity")
  }

  return {
    externalFormId: extractGoogleFormId(formId),
    connectionMode: "api",
    displayName: normalizedDisplayName,
    identityQuestionId: questionId,
  }
}

export function googleFormsApiRecordExternalId(responseId: string) {
  return `forms:api:${responseId}`
}

/**
 * Normalizes live API responses into connector records. Responses without a
 * resolvable client email are skipped, mirroring the manual CSV filter.
 */
export function buildGoogleFormsApiRecords({
  workspaceId,
  sourceId,
  source,
  form,
  responses,
}: {
  workspaceId: string
  sourceId: string
  source: Pick<GoogleFormsApiSourceConfig, "externalFormId" | "displayName"> & {
    identityQuestionId?: string | null
  }
  form: Pick<GoogleFormsApiForm, "questions">
  responses: GoogleFormsApiResponse[]
}): NormalizedConnectorRecord[] {
  const identityQuestionId = source.identityQuestionId ?? null
  return responses.flatMap((response) => {
    const email = apiResponseEmail(response, identityQuestionId)
    const occurredAt =
      isoTimestamp(response.createTime) ?? isoTimestamp(response.lastSubmittedTime)
    if (!email || !occurredAt || !response.responseId.trim()) return []

    const pairs = form.questions.flatMap((question) => {
      const answer = (response.answers[question.id] ?? "").trim()
      return question.id !== identityQuestionId && answer
        ? [
            {
              question: question.title.trim() || `Question ${question.id}`,
              answer,
            },
          ]
        : []
    })

    return [
      {
        workspaceId,
        sourceId,
        sourceType: "forms",
        externalId: googleFormsApiRecordExternalId(response.responseId),
        recordType: "google_form_response",
        eventType: "form_submission",
        occurredAt,
        body: createQaTimelineEventBody(pairs),
        participants: [{ email, role: "external" }],
        metadata: {
          externalFormId: source.externalFormId,
          formTitle: source.displayName,
          connectionMode: "api",
          responseId: response.responseId,
          createTime: response.createTime,
          lastSubmittedTime: response.lastSubmittedTime,
        },
        attributes: pairs.map(({ question, answer }) => ({
          key: question,
          value: answer as Json,
          confidence: 1,
        })),
        sensitivityLevel: 0,
      } satisfies NormalizedConnectorRecord,
    ]
  })
}

function apiResponseEmail(
  response: GoogleFormsApiResponse,
  identityQuestionId: string | null
): string | null {
  const collected = (response.respondentEmail ?? "").trim().toLowerCase()
  if (isValidEmail(collected)) return collected
  const answered = identityQuestionId
    ? (response.answers[identityQuestionId] ?? "").trim().toLowerCase()
    : ""
  return isValidEmail(answered) ? answered : null
}

function isoTimestamp(value: string | undefined): string | null {
  const parsed = Date.parse((value ?? "").trim())
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}
