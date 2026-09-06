import type {
  NormalizedConnectorRecord,
  NormalizedIdentity,
} from "@/features/clients/domain/connector-record"
import {
  createQaTimelineEventBody,
  EMPTY_TIMELINE_EVENT_BODY,
} from "@/features/clients/domain/timeline-event-body"
import type { Json } from "@/lib/database.types"

// --- Stripe object shapes (only the fields the connector reads) -------------

export type StripeAccount = {
  id: string
  name: string
  livemode: boolean
}

export type StripeCustomer = {
  id: string
  object?: "customer"
  email?: string | null
  name?: string | null
  created?: number
  deleted?: boolean
}

type CustomerRef = string | StripeCustomer | null | undefined

export type StripeCharge = {
  id: string
  object?: "charge"
  amount: number
  amount_refunded?: number
  currency: string
  status: string
  created: number
  description?: string | null
  receipt_email?: string | null
  billing_details?: { email?: string | null; name?: string | null } | null
  customer?: CustomerRef
  refunded?: boolean
}

type ChargeRef = string | StripeCharge | null | undefined

export type StripeRefund = {
  id: string
  object?: "refund"
  amount: number
  currency: string
  status?: string | null
  created: number
  reason?: string | null
  charge?: ChargeRef
}

export type StripeDispute = {
  id: string
  object?: "dispute"
  amount: number
  currency: string
  status: string
  created: number
  reason?: string | null
  charge?: ChargeRef
}

export type StripeInvoice = {
  id: string
  object?: "invoice"
  number?: string | null
  amount_paid?: number
  amount_due?: number
  currency: string
  status?: string | null
  created: number
  customer?: CustomerRef
  customer_email?: string | null
  customer_name?: string | null
  hosted_invoice_url?: string | null
  status_transitions?: { paid_at?: number | null } | null
}

export type StripeSubscription = {
  id: string
  object?: "subscription"
  status: string
  created: number
  canceled_at?: number | null
  current_period_end?: number | null
  customer?: CustomerRef
  items?: {
    data?: Array<{
      price?: {
        nickname?: string | null
        unit_amount?: number | null
        currency?: string
        recurring?: { interval?: string } | null
        product?: string | { name?: string } | null
      } | null
    }>
  } | null
}

export type StripeEvent = {
  id: string
  type: string
  created: number
  data: { object: unknown }
}

export type StripeObjectKind =
  | "customer"
  | "charge"
  | "refund"
  | "dispute"
  | "invoice"
  | "subscription"

export type StripeObject =
  | { kind: "customer"; object: StripeCustomer }
  | { kind: "charge"; object: StripeCharge }
  | { kind: "refund"; object: StripeRefund }
  | { kind: "dispute"; object: StripeDispute }
  | { kind: "invoice"; object: StripeInvoice }
  | { kind: "subscription"; object: StripeSubscription }

export type StripeListResource =
  | "customers"
  | "charges"
  | "refunds"
  | "disputes"
  | "invoices"
  | "subscriptions"
  | "events"

export const STRIPE_LIST_RESOURCE: Record<StripeObjectKind, StripeListResource> =
  {
    customer: "customers",
    charge: "charges",
    refund: "refunds",
    dispute: "disputes",
    invoice: "invoices",
    subscription: "subscriptions",
  }

/** Expansions that pull the customer (and its email) inline with each list page. */
export const STRIPE_LIST_EXPAND: Record<StripeObjectKind, string[]> = {
  customer: [],
  charge: ["data.customer"],
  refund: ["data.charge.customer"],
  dispute: ["data.charge.customer"],
  invoice: ["data.customer"],
  subscription: ["data.customer"],
}

/** Event types whose `data.object` is re-ingested to pick up status changes. */
export const STRIPE_EVENT_TYPES = [
  "charge.refunded",
  "charge.failed",
  "charge.updated",
  "charge.dispute.updated",
  "charge.dispute.closed",
  "invoice.paid",
  "invoice.voided",
  "invoice.marked_uncollectible",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.updated",
] as const

export type StripeSourceConfig = {
  displayName: string
  accountId: string
  syncFrom: string
}

export function buildStripeSourceConfig({
  displayName,
  accountId,
  syncFrom,
}: {
  displayName: string
  accountId: string
  syncFrom: string
}): StripeSourceConfig {
  const normalizedDisplayName = displayName.trim()
  if (!normalizedDisplayName) throw new Error("invalid_data_source_name")
  if (!accountId.trim()) throw new Error("invalid_stripe_config")
  const parsedSyncFrom = Date.parse(syncFrom)
  if (Number.isNaN(parsedSyncFrom)) throw new Error("invalid_stripe_config")
  return {
    displayName: normalizedDisplayName,
    accountId: accountId.trim(),
    syncFrom: new Date(parsedSyncFrom).toISOString(),
  }
}

// --- Object → normalized record --------------------------------------------

export function stripeObjectFromEvent(event: StripeEvent): StripeObject | null {
  const object = event.data?.object as { object?: string } | null
  const kind = object?.object
  if (
    kind === "customer" ||
    kind === "charge" ||
    kind === "refund" ||
    kind === "dispute" ||
    kind === "invoice" ||
    kind === "subscription"
  ) {
    return { kind, object } as StripeObject
  }
  return null
}

/** Email already present on the object, without any extra API call. */
export function stripeObjectEmail(item: StripeObject): string | null {
  const { kind, object } = item
  if (kind === "customer") return normalizeEmail(object.email)
  if (kind === "charge") return chargeEmail(object)
  if (kind === "invoice") {
    return (
      normalizeEmail(object.customer_email) ?? customerEmail(object.customer)
    )
  }
  if (kind === "subscription") return customerEmail(object.customer)
  return chargeEmail(refCharge(object.charge))
}

/** Customer id to look up when `stripeObjectEmail` came back empty. */
export function stripeObjectCustomerId(item: StripeObject): string | null {
  const { kind, object } = item
  if (kind === "customer") return null
  if (kind === "refund" || kind === "dispute") {
    return customerId(refCharge(object.charge)?.customer)
  }
  return customerId(object.customer)
}

export function stripeRecordExternalId(item: StripeObject) {
  return `stripe:${item.kind}:${item.object.id}`
}

export function buildStripeRecord({
  workspaceId,
  sourceId,
  source,
  item,
  email,
}: {
  workspaceId: string
  sourceId: string
  source: Pick<StripeSourceConfig, "accountId">
  item: StripeObject
  email: string
}): NormalizedConnectorRecord {
  const detail = describeStripeObject(item)
  const identities = identitiesOf(item)
  return {
    workspaceId,
    sourceId,
    sourceType: "stripe",
    externalId: stripeRecordExternalId(item),
    recordType: `stripe_${item.kind}`,
    // A customer with no charge or invoice in the sync window would otherwise
    // land with an empty timeline, so the import itself is the entry.
    eventType: item.kind === "customer" ? "system_event" : "payment",
    occurredAt: new Date(detail.occurredAt * 1000).toISOString(),
    body:
      detail.pairs.length > 0
        ? createQaTimelineEventBody(detail.pairs)
        : EMPTY_TIMELINE_EVENT_BODY,
    participants: [{ email, name: detail.name, role: "external" }],
    metadata: {
      accountId: source.accountId,
      title: detail.title,
      stripeObject: item.kind,
      stripeId: item.object.id,
      status: detail.status,
      amount: detail.amount,
      currency: detail.currency,
    },
    attributes: detail.attributes,
    ...(identities.length > 0 ? { identities } : {}),
    sensitivityLevel: 0,
  }
}

type StripeObjectDetail = {
  title: string
  status: string | null
  amount: number | null
  currency: string | null
  occurredAt: number
  name: string | null
  pairs: Array<{ question: string; answer: string }>
  attributes: NormalizedConnectorRecord["attributes"]
}

function describeStripeObject(item: StripeObject): StripeObjectDetail {
  const { kind, object } = item
  if (kind === "customer") {
    return {
      title: "Added as a Stripe customer",
      status: null,
      amount: null,
      currency: null,
      occurredAt: object.created ?? 0,
      name: object.name?.trim() || null,
      pairs: pairs([
        ["Name", object.name],
        ["Email", object.email],
        [
          "Customer since",
          object.created
            ? new Date(object.created * 1000).toISOString()
            : null,
        ],
      ]),
      attributes: [
        { key: "stripe_customer_id", value: object.id, confidence: 1 },
        ...(object.created
          ? [
              {
                key: "stripe_customer_since",
                value: new Date(object.created * 1000).toISOString() as Json,
                confidence: 1,
              },
            ]
          : []),
      ],
    }
  }
  if (kind === "charge") {
    const money = formatMoney(object.amount, object.currency)
    const status = object.refunded ? "refunded" : object.status
    return {
      title: `${chargeTitle(status)} ${money}`,
      status,
      amount: object.amount,
      currency: object.currency,
      occurredAt: object.created,
      name: object.billing_details?.name?.trim() || customerName(object.customer),
      pairs: pairs([
        ["Amount", money],
        ["Status", status],
        ["Description", object.description],
        [
          "Refunded",
          object.amount_refunded
            ? formatMoney(object.amount_refunded, object.currency)
            : null,
        ],
      ]),
      attributes: [],
    }
  }
  if (kind === "refund") {
    const money = formatMoney(object.amount, object.currency)
    return {
      title: `Refund ${money}`,
      status: object.status ?? null,
      amount: object.amount,
      currency: object.currency,
      occurredAt: object.created,
      name: customerName(refCharge(object.charge)?.customer),
      pairs: pairs([
        ["Refunded", money],
        ["Status", object.status],
        ["Reason", object.reason],
        ["Original charge", refCharge(object.charge)?.description],
      ]),
      attributes: [],
    }
  }
  if (kind === "dispute") {
    const money = formatMoney(object.amount, object.currency)
    return {
      title: `Dispute ${money}`,
      status: object.status,
      amount: object.amount,
      currency: object.currency,
      occurredAt: object.created,
      name: customerName(refCharge(object.charge)?.customer),
      pairs: pairs([
        ["Disputed", money],
        ["Status", object.status],
        ["Reason", object.reason],
        ["Original charge", refCharge(object.charge)?.description],
      ]),
      attributes: [],
    }
  }
  if (kind === "invoice") {
    const amount = object.amount_paid || object.amount_due || 0
    const money = formatMoney(amount, object.currency)
    const status = object.status ?? "draft"
    return {
      title: `Invoice ${object.number ?? object.id} ${money}`,
      status,
      amount,
      currency: object.currency,
      occurredAt: object.status_transitions?.paid_at || object.created,
      name: object.customer_name?.trim() || customerName(object.customer),
      pairs: pairs([
        ["Invoice", object.number ?? object.id],
        ["Amount", money],
        ["Status", status],
        ["Link", object.hosted_invoice_url],
      ]),
      attributes: [],
    }
  }
  const plan = subscriptionPlan(object)
  return {
    title: `Subscription ${object.status}${plan ? ` · ${plan}` : ""}`,
    status: object.status,
    amount: null,
    currency: null,
    occurredAt: object.canceled_at || object.created,
    name: customerName(object.customer),
    pairs: pairs([
      ["Plan", plan],
      ["Status", object.status],
      [
        "Cancelled",
        object.canceled_at
          ? new Date(object.canceled_at * 1000).toISOString()
          : null,
      ],
    ]),
    attributes: [
      { key: "stripe_subscription_status", value: object.status, confidence: 1 },
      ...(plan
        ? [{ key: "stripe_subscription_plan", value: plan as Json, confidence: 1 }]
        : []),
    ],
  }
}

function identitiesOf(item: StripeObject): NormalizedIdentity[] {
  const id =
    item.kind === "customer" ? item.object.id : stripeObjectCustomerId(item)
  return id ? [{ type: "external_id", value: id }] : []
}

function subscriptionPlan(subscription: StripeSubscription): string | null {
  const price = subscription.items?.data?.[0]?.price
  if (!price) return null
  const product =
    typeof price.product === "object" && price.product?.name
      ? price.product.name
      : null
  const label = price.nickname?.trim() || product
  const amount =
    typeof price.unit_amount === "number" && price.currency
      ? `${formatMoney(price.unit_amount, price.currency)}${
          price.recurring?.interval ? `/${price.recurring.interval}` : ""
        }`
      : null
  return [label, amount].filter(Boolean).join(" ") || null
}

function chargeTitle(status: string) {
  if (status === "succeeded") return "Payment"
  if (status === "refunded") return "Payment refunded"
  if (status === "failed") return "Payment failed"
  return "Payment pending"
}

function chargeEmail(charge: StripeCharge | null) {
  if (!charge) return null
  return (
    normalizeEmail(charge.billing_details?.email) ??
    normalizeEmail(charge.receipt_email) ??
    customerEmail(charge.customer)
  )
}

function refCharge(ref: ChargeRef): StripeCharge | null {
  return ref && typeof ref === "object" ? ref : null
}

function customerEmail(ref: CustomerRef) {
  return ref && typeof ref === "object" ? normalizeEmail(ref.email) : null
}

function customerName(ref: CustomerRef) {
  return ref && typeof ref === "object" ? ref.name?.trim() || null : null
}

function customerId(ref: CustomerRef) {
  if (!ref) return null
  return typeof ref === "string" ? ref : ref.id
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

const ZERO_DECIMAL_CURRENCIES = new Set([
  "bif", "clp", "djf", "gnf", "jpy", "kmf", "krw", "mga", "pyg", "rwf",
  "ugx", "vnd", "vuv", "xaf", "xof", "xpf",
])

export function formatMoney(amount: number, currency: string) {
  const code = currency.toUpperCase()
  const value = ZERO_DECIMAL_CURRENCIES.has(currency.toLowerCase())
    ? amount
    : amount / 100
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: code,
    }).format(value)
  } catch {
    return `${value.toFixed(2)} ${code}`
  }
}
