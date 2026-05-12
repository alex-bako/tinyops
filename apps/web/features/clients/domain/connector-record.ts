import type { Json } from "@/lib/database.types"
import {
  isValidTimelineEventBody,
  type TimelineEventBody,
} from "@/features/clients/domain/timeline-event-body"

export type ConnectorSourceType =
  | "imap"
  | "csv"
  | "forms"
  | "stripe"
  | "mailerlite"
  | "calendly"
  | "teachable"

export type NormalizedParticipantRole = "owner" | "external" | "unknown"

export type NormalizedParticipant = {
  email: string
  name?: string | null
  role: NormalizedParticipantRole
}

export type NormalizedClientAttribute = {
  key: string
  value: Json
  confidence?: number
}

export type NormalizedConnectorRecord = {
  workspaceId: string
  sourceId: string
  sourceType: ConnectorSourceType
  externalId: string
  recordType: string
  eventType:
    | "email_received"
    | "email_sent"
    | "form_submission"
    | "csv_import_row"
    | "manual_note"
    | "tinyops_email"
    | "system_event"
  occurredAt: string
  body: TimelineEventBody
  participants: NormalizedParticipant[]
  metadata: Json
  attributes: NormalizedClientAttribute[]
  sensitivityLevel: 0 | 1 | 2 | 3 | 4
}

export function assertValidNormalizedRecords(
  records: NormalizedConnectorRecord[]
) {
  for (const record of records) {
    if (!isValidNormalizedRecord(record)) {
      throw new Error("invalid_connector_record")
    }
  }
}

export function isValidNormalizedRecord(record: NormalizedConnectorRecord) {
  return (
    nonEmpty(record.workspaceId) &&
    nonEmpty(record.sourceId) &&
    nonEmpty(record.sourceType) &&
    nonEmpty(record.externalId) &&
    nonEmpty(record.recordType) &&
    validEventType(record.eventType) &&
    nonEmpty(record.occurredAt) &&
    !Number.isNaN(Date.parse(record.occurredAt)) &&
    isValidTimelineEventBody(record.body) &&
    Array.isArray(record.participants) &&
    record.participants.every(validParticipant) &&
    Array.isArray(record.attributes) &&
    record.attributes.every((attribute) => nonEmpty(attribute.key)) &&
    Number.isInteger(record.sensitivityLevel) &&
    record.sensitivityLevel >= 0 &&
    record.sensitivityLevel <= 4
  )
}

function validParticipant(participant: NormalizedParticipant) {
  if (participant.role === "external") return nonEmpty(participant.email)
  return (
    nonEmpty(participant.email) &&
    (participant.role === "owner" || participant.role === "unknown")
  )
}

function nonEmpty(value: string) {
  return value.trim().length > 0
}

function validEventType(value: string) {
  return (
    value === "email_received" ||
    value === "email_sent" ||
    value === "form_submission" ||
    value === "csv_import_row" ||
    value === "manual_note" ||
    value === "tinyops_email" ||
    value === "system_event"
  )
}
