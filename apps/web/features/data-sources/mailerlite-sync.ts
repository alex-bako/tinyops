import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
  ConnectorIngestionResult,
} from "@/features/clients/application/connector-ingestion"
import type { NormalizedConnectorRecord } from "@/features/clients/domain/connector-record"
import {
  buildMailerLiteEngagementRecord,
  buildMailerLiteOrderRecord,
  buildMailerLiteSubscriberRecord,
  mailerLiteDate,
  type MailerLiteCampaign,
  type MailerLiteCampaignActivity,
  type MailerLiteOrder,
  type MailerLiteSubscriber,
} from "@/features/data-sources/mailerlite"
import type {
  MailerLiteApiPort,
  MailerLiteDataSource,
} from "@/features/data-sources/types"
import type { Json } from "@/lib/database.types"

const CAMPAIGN_PAGE = 25
/** Campaigns older than this are scanned once; newer ones are re-scanned every run. */
const RESCAN_WINDOW_MS = 30 * 24 * 60 * 60 * 1000
const REPORT_LIMITS = [100, 50, 25, 10]

type Phase = "subscriber" | "order" | "campaign"
type Activity = "opened" | "clicked"

export type MailerLiteCursor = {
  phase: Phase
  /** Subscriber list cursor. */
  cursor: string | null
  /** Order phase: which of `source.shops`, and its page. */
  shopIndex: number
  page: number
  /** Campaign phase: position in the campaigns page and the report being read. */
  campaignIndex: number
  activity: Activity
  activityPage: number
  /** ISO time the running campaign pass started; folded into `lastCampaignPass` when it completes. */
  campaignPassStartedAt: string | null
  lastCampaignPass: string | null
}

const START: MailerLiteCursor = {
  phase: "subscriber",
  cursor: null,
  shopIndex: 0,
  page: 1,
  campaignIndex: 0,
  activity: "opened",
  activityPage: 1,
  campaignPassStartedAt: null,
  lastCampaignPass: null,
}

/**
 * Every run walks all subscribers, then every shop's orders, then the
 * subscriber-activity report (opened, then clicked) of each sent campaign.
 * MailerLite lists have no "changed since" filter, so subscribers and orders
 * are re-walked in full (upserts are idempotent); campaigns finished more than
 * 30 days before the previous pass are skipped.
 */
export function createMailerLiteConnector({
  source,
  api,
  now = () => Date.now(),
}: {
  source: MailerLiteDataSource
  api: MailerLiteApiPort
  now?: () => number
}): ConnectorIngestionPort {
  const syncFrom = Date.parse(source.syncFrom)

  async function collect(
    input: ConnectorIngestionInput
  ): Promise<ConnectorIngestionResult> {
    const limit = Math.max(1, input.limit ?? 50)
    const cursor = mailerLiteCursor(source.sync.cursor as Json | null)
    const scope = { workspaceId: input.workspaceId, sourceId: input.sourceId }
    const step =
      cursor.phase === "subscriber"
        ? await subscribers(cursor, limit, scope)
        : cursor.phase === "order"
          ? await orders(cursor, limit, scope)
          : await campaigns(cursor, limit, scope)
    return {
      records: step.records,
      truncated: step.next.phase !== "subscriber" || step.next.cursor !== null,
      cursor: { mailerlite: step.next } satisfies Json,
      diagnostics: {
        phase: cursor.phase,
        scanned: step.scanned,
        accepted: step.records.length,
        skippedWithoutEmail: step.scanned - step.records.length,
      },
    }
  }

  async function subscribers(
    cursor: MailerLiteCursor,
    limit: number,
    scope: { workspaceId: string; sourceId: string }
  ) {
    const page = await api.list("subscribers", {
      limit,
      cursor: cursor.cursor ?? undefined,
      include: "groups",
    })
    const items = page.data as MailerLiteSubscriber[]
    const records = items.flatMap((subscriber) =>
      nonNull(buildMailerLiteSubscriberRecord(scope, subscriber))
    )
    const next: MailerLiteCursor = page.nextCursor
      ? { ...cursor, cursor: page.nextCursor }
      : source.shops.length > 0
        ? { ...cursor, phase: "order", cursor: null, shopIndex: 0, page: 1 }
        : startCampaignPass(cursor)
    return { records, scanned: items.length, next }
  }

  async function orders(
    cursor: MailerLiteCursor,
    limit: number,
    scope: { workspaceId: string; sourceId: string }
  ) {
    const shop = source.shops[cursor.shopIndex]
    if (!shop) return { records: [], scanned: 0, next: startCampaignPass(cursor) }
    const page = await api.list(
      `ecommerce/shops/${encodeURIComponent(shop.id)}/orders`,
      { limit, page: cursor.page }
    )
    const items = (page.data as MailerLiteOrder[]).filter((order) =>
      onOrAfterSyncFrom(order.created_at)
    )
    const records = items.flatMap((order) =>
      nonNull(buildMailerLiteOrderRecord(scope, order))
    )
    const next: MailerLiteCursor = page.hasMore
      ? { ...cursor, page: cursor.page + 1 }
      : cursor.shopIndex + 1 < source.shops.length
        ? { ...cursor, shopIndex: cursor.shopIndex + 1, page: 1 }
        : startCampaignPass(cursor)
    return { records, scanned: items.length, next }
  }

  async function campaigns(
    cursor: MailerLiteCursor,
    limit: number,
    scope: { workspaceId: string; sourceId: string }
  ) {
    const page = await api.list("campaigns", {
      "filter[status]": "sent",
      limit: CAMPAIGN_PAGE,
      page: cursor.page,
    })
    const campaign = (page.data as MailerLiteCampaign[])[cursor.campaignIndex]
    if (!campaign) {
      const next: MailerLiteCursor = page.hasMore
        ? { ...cursor, page: cursor.page + 1, campaignIndex: 0 }
        : {
            ...START,
            lastCampaignPass: cursor.campaignPassStartedAt ?? cursor.lastCampaignPass,
          }
      return { records: [], scanned: 0, next }
    }
    if (!shouldScan(campaign, cursor)) {
      return { records: [], scanned: 0, next: nextCampaign(cursor) }
    }
    const report = await api.list(
      `campaigns/${encodeURIComponent(campaign.id)}/reports/subscriber-activity`,
      {
        "filter[type]": cursor.activity,
        limit: reportLimit(limit),
        page: cursor.activityPage,
      }
    )
    const items = report.data as MailerLiteCampaignActivity[]
    const records = items.flatMap((activity) =>
      nonNull(buildMailerLiteEngagementRecord(scope, campaign, activity))
    )
    const next: MailerLiteCursor = report.hasMore
      ? { ...cursor, activityPage: cursor.activityPage + 1 }
      : cursor.activity === "opened"
        ? { ...cursor, activity: "clicked", activityPage: 1 }
        : nextCampaign(cursor)
    return { records, scanned: items.length, next }
  }

  function shouldScan(campaign: MailerLiteCampaign, cursor: MailerLiteCursor) {
    const finishedAt = Date.parse(mailerLiteDate(campaign.finished_at) ?? "")
    if (Number.isNaN(finishedAt) || finishedAt < syncFrom) return false
    const frozen =
      finishedAt < now() - RESCAN_WINDOW_MS &&
      cursor.lastCampaignPass !== null &&
      finishedAt < Date.parse(cursor.lastCampaignPass)
    return !frozen
  }

  function startCampaignPass(cursor: MailerLiteCursor): MailerLiteCursor {
    return {
      ...cursor,
      phase: "campaign",
      cursor: null,
      page: 1,
      campaignIndex: 0,
      activity: "opened",
      activityPage: 1,
      campaignPassStartedAt: new Date(now()).toISOString(),
    }
  }

  function onOrAfterSyncFrom(value: string | null | undefined) {
    const at = Date.parse(mailerLiteDate(value) ?? "")
    return !Number.isNaN(at) && at >= syncFrom
  }

  return { preview: collect, sync: collect }
}

function nextCampaign(cursor: MailerLiteCursor): MailerLiteCursor {
  return {
    ...cursor,
    campaignIndex: cursor.campaignIndex + 1,
    activity: "opened",
    activityPage: 1,
  }
}

/** The report endpoint only accepts 10, 25, 50 or 100. */
function reportLimit(limit: number) {
  return REPORT_LIMITS.find((allowed) => allowed <= limit) ?? 10
}

function nonNull(record: NormalizedConnectorRecord | null) {
  return record ? [record] : []
}

export function mailerLiteCursor(cursor: Json | null): MailerLiteCursor {
  const value =
    cursor && typeof cursor === "object" && !Array.isArray(cursor)
      ? ((cursor as { mailerlite?: Partial<MailerLiteCursor> }).mailerlite ?? {})
      : {}
  const phase = value.phase
  return {
    phase:
      phase === "order" || phase === "campaign" ? phase : "subscriber",
    cursor: typeof value.cursor === "string" ? value.cursor : null,
    shopIndex: positiveInt(value.shopIndex, 0),
    page: positiveInt(value.page, 1),
    campaignIndex: positiveInt(value.campaignIndex, 0),
    activity: value.activity === "clicked" ? "clicked" : "opened",
    activityPage: positiveInt(value.activityPage, 1),
    campaignPassStartedAt: isoOrNull(value.campaignPassStartedAt),
    lastCampaignPass: isoOrNull(value.lastCampaignPass),
  }
}

function positiveInt(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : fallback
}

function isoOrNull(value: unknown) {
  return typeof value === "string" && !Number.isNaN(Date.parse(value))
    ? value
    : null
}
