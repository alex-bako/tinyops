import type {
  ConnectorIngestionInput,
  ConnectorIngestionPort,
  ConnectorIngestionResult,
} from "@/features/clients/application/connector-ingestion"
import type { NormalizedConnectorRecord } from "@/features/clients/domain/connector-record"
import {
  buildStripeRecord,
  STRIPE_EVENT_TYPES,
  STRIPE_LIST_EXPAND,
  STRIPE_LIST_RESOURCE,
  stripeObjectCustomerId,
  stripeObjectEmail,
  stripeObjectFromEvent,
  type StripeEvent,
  type StripeObject,
  type StripeObjectKind,
} from "@/features/data-sources/stripe"
import type { StripeApiPort, StripeDataSource } from "@/features/data-sources/types"
import type { Json } from "@/lib/database.types"

const PHASES: StripeObjectKind[] = [
  "customer",
  "charge",
  "refund",
  "dispute",
  "invoice",
  "subscription",
]
const EVENTS_PHASE = "events"
const STRIPE_MAX_PAGE = 100

type Phase = StripeObjectKind | typeof EVENTS_PHASE

type StripeCursor = {
  phase: Phase
  startingAfter: string | null
  /** Max `created` seen per phase; the next run lists `created[gt]` it. */
  since: Partial<Record<Phase, number>>
  /** Max `created` seen while walking the current phase, folded into `since` when the phase completes. */
  maxSeen: number | null
}

/**
 * Walks each Stripe resource newest-first with `starting_after` pagination,
 * then replays recent events so status changes on already-imported objects
 * (a cancelled subscription, a closed dispute) are re-ingested in place.
 * Every run repeats the full phase list; phases with nothing new cost one
 * request each.
 */
export function createStripeConnector({
  source,
  api,
  now = () => Date.now(),
}: {
  source: StripeDataSource
  api: StripeApiPort
  now?: () => number
}): ConnectorIngestionPort {
  async function collect(
    input: ConnectorIngestionInput
  ): Promise<ConnectorIngestionResult> {
    const limit = Math.min(STRIPE_MAX_PAGE, Math.max(1, input.limit ?? 50))
    const cursor = stripeCursor(source.sync.cursor as Json | null)
    const page =
      cursor.phase === EVENTS_PHASE
        ? await listEventObjects(cursor, limit)
        : await listObjects(cursor.phase, cursor, limit)
    const resolveEmail = customerEmailResolver(api)
    const records: NormalizedConnectorRecord[] = []
    let skipped = 0
    for (const item of page.items) {
      const email = await resolveEmail(item)
      if (!email) {
        skipped += 1
        continue
      }
      records.push(
        buildStripeRecord({
          workspaceId: input.workspaceId,
          sourceId: input.sourceId,
          source,
          item,
          email,
        })
      )
    }

    const maxSeen = maxCreated([cursor.maxSeen, ...page.created])
    const nextCursor = page.hasMore
      ? { ...cursor, startingAfter: page.lastId, maxSeen }
      : advancePhase(cursor, maxSeen)

    return {
      records,
      truncated: nextCursor.phase !== "customer" || nextCursor.startingAfter !== null,
      cursor: { stripe: nextCursor } satisfies Json,
      diagnostics: {
        phase: cursor.phase,
        scanned: page.items.length,
        accepted: records.length,
        skippedWithoutEmail: skipped,
      },
    }
  }

  async function listObjects(
    kind: StripeObjectKind,
    cursor: StripeCursor,
    limit: number
  ) {
    const since = cursor.since[kind]
    const result = await api.list(STRIPE_LIST_RESOURCE[kind], {
      limit,
      starting_after: cursor.startingAfter ?? undefined,
      expand: STRIPE_LIST_EXPAND[kind],
      ...(since
        ? { "created[gt]": since }
        : { "created[gte]": unixSeconds(source.syncFrom) }),
      ...(kind === "subscription" ? { status: "all" } : {}),
    })
    const objects = result.data as Array<{ id: string; created: number }>
    return {
      items: objects.map((object) => ({ kind, object }) as StripeObject),
      created: objects.map((object) => object.created),
      hasMore: result.hasMore,
      lastId: objects.at(-1)?.id ?? null,
    }
  }

  async function listEventObjects(cursor: StripeCursor, limit: number) {
    const since = cursor.since[EVENTS_PHASE]
    if (!since) {
      // First run: the backfill already covered history; start watching from now.
      return {
        items: [],
        created: [unixSeconds(new Date(now()).toISOString())],
        hasMore: false,
        lastId: null,
      }
    }
    const result = await api.list("events", {
      limit,
      starting_after: cursor.startingAfter ?? undefined,
      "created[gt]": since,
      types: [...STRIPE_EVENT_TYPES],
    })
    const events = result.data as StripeEvent[]
    return {
      items: events.flatMap((event) => {
        const item = stripeObjectFromEvent(event)
        return item ? [item] : []
      }),
      created: events.map((event) => event.created),
      hasMore: result.hasMore,
      lastId: events.at(-1)?.id ?? null,
    }
  }

  return { preview: collect, sync: collect }
}

function advancePhase(cursor: StripeCursor, maxSeen: number | null): StripeCursor {
  const since = { ...cursor.since }
  if (maxSeen !== null) since[cursor.phase] = maxSeen
  const index = PHASES.indexOf(cursor.phase as StripeObjectKind)
  const nextPhase: Phase =
    cursor.phase === EVENTS_PHASE
      ? "customer"
      : (PHASES[index + 1] ?? EVENTS_PHASE)
  return { phase: nextPhase, startingAfter: null, since, maxSeen: null }
}

function customerEmailResolver(api: StripeApiPort) {
  const cache = new Map<string, Promise<string | null>>()
  return async (item: StripeObject) => {
    const inline = stripeObjectEmail(item)
    if (inline) return inline
    const customerId = stripeObjectCustomerId(item)
    if (!customerId) return null
    let lookup = cache.get(customerId)
    if (!lookup) {
      lookup = api
        .getCustomer(customerId)
        .then((customer) => (customer ? stripeObjectEmail({ kind: "customer", object: customer }) : null))
      cache.set(customerId, lookup)
    }
    return lookup
  }
}

export function stripeCursor(cursor: Json | null): StripeCursor {
  const value =
    cursor && typeof cursor === "object" && !Array.isArray(cursor)
      ? (cursor as { stripe?: Partial<StripeCursor> }).stripe
      : undefined
  const phase = value?.phase
  return {
    phase:
      phase === EVENTS_PHASE || PHASES.includes(phase as StripeObjectKind)
        ? (phase as Phase)
        : "customer",
    startingAfter:
      typeof value?.startingAfter === "string" ? value.startingAfter : null,
    since: Object.fromEntries(
      Object.entries(value?.since ?? {}).filter(
        ([, seen]) => typeof seen === "number"
      )
    ) as StripeCursor["since"],
    maxSeen: typeof value?.maxSeen === "number" ? value.maxSeen : null,
  }
}

function maxCreated(values: Array<number | null | undefined>) {
  return values.reduce<number | null>(
    (latest, value) =>
      typeof value === "number" && (latest === null || value > latest)
        ? value
        : latest,
    null
  )
}

function unixSeconds(iso: string) {
  return Math.floor(Date.parse(iso) / 1000)
}
