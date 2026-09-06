import type {
  NormalizedConnectorRecord,
  NormalizedIdentity,
} from "@/features/clients/domain/connector-record"
import {
  createQaTimelineEventBody,
} from "@/features/clients/domain/timeline-event-body"
import type { Json } from "@/lib/database.types"

// --- MailerLite object shapes (only the fields the connector reads) ---------

export type MailerLiteShop = {
  id: string
  name: string
  currency: string
}

export type MailerLiteSubscriber = {
  id: string
  email: string
  status?: string | null
  source?: string | null
  subscribed_at?: string | null
  unsubscribed_at?: string | null
  created_at?: string | null
  fields?: Record<string, unknown> | null
  groups?: Array<{ id?: string; name?: string | null }> | null
}

export type MailerLiteOrder = {
  id: string
  status?: string | null
  total?: number | string | null
  created_at?: string | null
  shop?: { id?: string; name?: string | null; currency?: string | null } | null
  customer?: {
    id?: string
    email?: string | null
    subscriber?: MailerLiteSubscriber | null
  } | null
  cart?: {
    items?: Array<{
      quantity?: number | string | null
      product?: { name?: string | null } | null
      variant?: string | null
    }> | null
  } | null
}

export type MailerLiteCampaign = {
  id: string
  name?: string | null
  status?: string | null
  finished_at?: string | null
  emails?: Array<{ subject?: string | null }> | null
}

export type MailerLiteCampaignActivity = {
  id?: string
  opens_count?: number | null
  clicks_count?: number | null
  subscriber?: MailerLiteSubscriber | null
}

export type MailerLiteSourceConfig = {
  displayName: string
  accountId: string
  syncFrom: string
  shops: MailerLiteShop[]
}

export function buildMailerLiteSourceConfig({
  displayName,
  shops,
  syncFrom,
}: {
  displayName: string
  shops: MailerLiteShop[]
  syncFrom: string
}): MailerLiteSourceConfig {
  const normalizedDisplayName = displayName.trim()
  if (!normalizedDisplayName) throw new Error("invalid_data_source_name")
  const parsedSyncFrom = Date.parse(syncFrom)
  if (Number.isNaN(parsedSyncFrom)) throw new Error("invalid_mailerlite_config")
  return {
    displayName: normalizedDisplayName,
    // Empty when there is no shop; the connect RPC then falls back to the key hash.
    accountId: shops.map((shop) => shop.id).join(","),
    syncFrom: new Date(parsedSyncFrom).toISOString(),
    shops,
  }
}

// --- Object → normalized record --------------------------------------------

type RecordScope = { workspaceId: string; sourceId: string }

/** MailerLite statuses that read better than "Subscribed to MailerLite". */
const SUBSCRIBER_TITLES: Record<string, string> = {
  unsubscribed: "Unsubscribed from MailerLite",
  unconfirmed: "Subscribed to MailerLite (unconfirmed)",
  bounced: "MailerLite email bounced",
  junk: "Marked as junk in MailerLite",
}

function subscriberTitle(status: string | null): string {
  return (status && SUBSCRIBER_TITLES[status]) || "Subscribed to MailerLite"
}

export function buildMailerLiteSubscriberRecord(
  scope: RecordScope,
  subscriber: MailerLiteSubscriber
): NormalizedConnectorRecord | null {
  const email = normalizeEmail(subscriber.email)
  if (!email) return null
  const status = subscriber.status?.trim() || null
  const groups = (subscriber.groups ?? []).flatMap((group) =>
    group.name?.trim() ? [group.name.trim()] : []
  )
  const subscribedAt = mailerLiteDate(subscriber.subscribed_at)
  return {
    workspaceId: scope.workspaceId,
    sourceId: scope.sourceId,
    sourceType: "mailerlite",
    externalId: `mailerlite:subscriber:${subscriber.id}`,
    recordType: "mailerlite_subscriber",
    // A subscriber is the only record type that exists for an account without
    // e-commerce or sent campaigns. Without an event the profile renders empty,
    // so the import itself is the timeline entry.
    eventType: "system_event",
    occurredAt:
      subscribedAt ??
      mailerLiteDate(subscriber.created_at) ??
      new Date(0).toISOString(),
    body: createQaTimelineEventBody(
      pairs([
        ["Status", status],
        ["Groups", groups.join(", ")],
        ["Subscribed", subscribedAt],
      ])
    ),
    participants: [{ email, name: subscriberName(subscriber), role: "external" }],
    metadata: { title: subscriberTitle(status), status },
    attributes: [
      { key: "mailerlite_subscriber_id", value: subscriber.id, confidence: 1 },
      ...(status ? [{ key: "mailerlite_status", value: status, confidence: 1 }] : []),
      ...(groups.length > 0
        ? [{ key: "mailerlite_groups", value: groups as Json, confidence: 1 }]
        : []),
      ...(subscribedAt
        ? [{ key: "mailerlite_subscribed_at", value: subscribedAt, confidence: 1 }]
        : []),
      ...customFieldAttributes(subscriber.fields),
    ],
    identities: [{ type: "external_id", value: subscriber.id }],
    sensitivityLevel: 0,
  }
}

export function buildMailerLiteOrderRecord(
  scope: RecordScope,
  order: MailerLiteOrder
): NormalizedConnectorRecord | null {
  const email = normalizeEmail(
    order.customer?.email ?? order.customer?.subscriber?.email
  )
  if (!email) return null
  const status = order.status?.trim() || "unknown"
  const amount = Number(order.total ?? 0)
  const currency = order.shop?.currency?.trim() || null
  const money = formatMailerLiteMoney(amount, currency)
  const items = (order.cart?.items ?? []).flatMap((item) => {
    const name = item.product?.name?.trim()
    if (!name) return []
    const quantity = Number(item.quantity ?? 1) || 1
    const variant = item.variant?.trim()
    return [`${quantity}× ${name}${variant ? ` (${variant})` : ""}`]
  })
  const subscriber = order.customer?.subscriber ?? null
  return {
    workspaceId: scope.workspaceId,
    sourceId: scope.sourceId,
    sourceType: "mailerlite",
    externalId: `mailerlite:order:${order.id}`,
    recordType: "mailerlite_order",
    eventType: "payment",
    occurredAt: mailerLiteDate(order.created_at) ?? new Date(0).toISOString(),
    body: createQaTimelineEventBody(
      pairs([
        ["Total", money],
        ["Status", status],
        ["Items", items.join(", ")],
        ["Shop", order.shop?.name],
      ])
    ),
    participants: [
      { email, name: subscriber ? subscriberName(subscriber) : null, role: "external" },
    ],
    metadata: {
      title: `Order ${status} ${money}`,
      mailerliteObject: "order",
      mailerliteId: order.id,
      status,
      amount,
      currency,
      shopId: order.shop?.id ?? null,
    },
    attributes: [],
    ...identities(subscriber?.id),
    sensitivityLevel: 0,
  }
}

export function buildMailerLiteEngagementRecord(
  scope: RecordScope,
  campaign: MailerLiteCampaign,
  activity: MailerLiteCampaignActivity
): NormalizedConnectorRecord | null {
  const subscriber = activity.subscriber
  const email = normalizeEmail(subscriber?.email)
  if (!subscriber || !email) return null
  const subject = campaign.emails?.[0]?.subject?.trim() || null
  const name = campaign.name?.trim() || campaign.id
  const opens = Number(activity.opens_count ?? 0) || 0
  const clicks = Number(activity.clicks_count ?? 0) || 0
  const verb = clicks > 0 ? "Clicked" : "Opened"
  return {
    workspaceId: scope.workspaceId,
    sourceId: scope.sourceId,
    sourceType: "mailerlite",
    externalId: `mailerlite:engagement:${campaign.id}:${subscriber.id}`,
    recordType: "mailerlite_campaign_activity",
    eventType: "email_engagement",
    // The report has no per-open timestamp; the send time is the best anchor.
    occurredAt: mailerLiteDate(campaign.finished_at) ?? new Date(0).toISOString(),
    body: createQaTimelineEventBody(
      pairs([
        ["Campaign", name],
        ["Subject", subject],
        ["Opens", String(opens)],
        ["Clicks", String(clicks)],
      ])
    ),
    participants: [{ email, name: subscriberName(subscriber), role: "external" }],
    metadata: {
      title: `${verb} · ${subject ?? name}`,
      mailerliteObject: "campaign_activity",
      campaignId: campaign.id,
      campaignName: name,
      subject,
      opens,
      clicks,
    },
    attributes: [],
    ...identities(subscriber.id),
    sensitivityLevel: 0,
  }
}

/** "2021-09-01 14:03:50" (UTC, no zone) or ISO → ISO, null when unparsable. */
export function mailerLiteDate(value: string | null | undefined): string | null {
  if (!value) return null
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(value)
    ? `${value.replace(" ", "T")}Z`
    : value
  const parsed = Date.parse(normalized)
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString()
}

export function formatMailerLiteMoney(amount: number, currency: string | null) {
  const value = Number.isFinite(amount) ? amount : 0
  if (!currency) return value.toFixed(2)
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${currency.toUpperCase()}`
  }
}

const STANDARD_FIELDS = new Set(["name", "last_name"])

function customFieldAttributes(
  fields: Record<string, unknown> | null | undefined
): NormalizedConnectorRecord["attributes"] {
  return Object.entries(fields ?? {}).flatMap(([key, value]) => {
    if (STANDARD_FIELDS.has(key) || value === null || value === undefined) return []
    if (typeof value === "string" && !value.trim()) return []
    return [{ key: `mailerlite_field_${key}`, value: value as Json, confidence: 1 }]
  })
}

function subscriberName(subscriber: MailerLiteSubscriber) {
  const fields = subscriber.fields ?? {}
  const name = [fields.name, fields.last_name]
    .flatMap((part) => (typeof part === "string" && part.trim() ? [part.trim()] : []))
    .join(" ")
  return name || null
}

function identities(id: string | undefined): { identities?: NormalizedIdentity[] } {
  return id ? { identities: [{ type: "external_id", value: id }] } : {}
}

function normalizeEmail(value: string | null | undefined) {
  const email = (value ?? "").trim().toLowerCase()
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function pairs(
  entries: Array<[string, string | null | undefined]>
): Array<{ question: string; answer: string }> {
  return entries.flatMap(([question, answer]) =>
    answer?.trim() ? [{ question, answer: answer.trim() }] : []
  )
}
