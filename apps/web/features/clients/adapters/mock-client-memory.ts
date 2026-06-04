import { clientStatusBadge } from "@/lib/client-state"
import type {
  Client,
  ClientDetail,
  ClientMemoryRepositoryPort,
  ClientProperty,
  ClientPropertyValue,
  PropertyIcon,
  PropertyStatusKind,
} from "@/features/clients/application/client-memory"
import { createTextTimelineEventBody } from "@/features/clients/domain/timeline-event-body"

/** Attaches a deterministic id + position to demo property entries. */
function mockProps(
  entries: { name: string; icon: PropertyIcon; value: ClientPropertyValue }[]
): ClientProperty[] {
  return entries.map((entry, index) => ({
    id: `${slugify(entry.name)}-${index}`,
    name: entry.name,
    icon: entry.icon,
    type: entry.value.kind,
    value: entry.value,
    position: index,
  }))
}

/** Maps a status badge variant onto the property status palette. */
function mockStatusKind(kind: string): PropertyStatusKind {
  if (kind === "active" || kind === "warn" || kind === "brand") return kind
  return "neutral"
}

/* ──────────────────────────────────────────────────────────────────────
 * Slug helpers.
 * ────────────────────────────────────────────────────────────────────── */

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}

/* ──────────────────────────────────────────────────────────────────────
 * Anna Smith — full design-bundle content.
 * ────────────────────────────────────────────────────────────────────── */

const ANNA_DETAIL: Omit<ClientDetail, keyof Client | "slug" | "id"> = {
  joined: "Feb 12, 2026",
  location: "Berlin, DE",
  memory: {
    summary:
      "Anna joined the March cohort and has mainly interacted about accessing recordings and completing exercises. She asked for clearer replay instructions on Mar 8 and hasn't submitted feedback in six weeks.",
    confidence: 0.78,
    lastGenerated: "Generated 2h ago, from 9 events",
  },
  properties: mockProps([
    {
      name: "Status",
      icon: "circle-dot",
      value: { kind: "status", statusKind: "active", label: "Active" },
    },
    {
      name: "Cohort",
      icon: "hash",
      value: { kind: "tags", values: ["March cohort"] },
    },
    {
      name: "Joined",
      icon: "calendar",
      value: { kind: "date", text: "Feb 12, 2026" },
    },
    {
      name: "Last contact",
      icon: "send",
      value: { kind: "text", text: "Feb 28, 2026 · monthly check-in (generic)" },
    },
    {
      name: "Sources",
      icon: "plug",
      value: { kind: "tags", values: ["IMAP", "Forms", "CSV"] },
    },
    {
      name: "Original goal",
      icon: "target",
      value: {
        kind: "text",
        text: "Wanted structured guidance and practical exercises to improve communication in her relationship.",
      },
    },
    {
      name: "Current progress",
      icon: "activity",
      value: {
        kind: "text",
        text: "Engaging with course materials but no submitted feedback in 6 weeks.",
      },
    },
    {
      name: "Recommended action",
      icon: "wand",
      value: {
        kind: "text",
        text: "Overdue — send a light monthly check-in asking how the exercises have been going.",
      },
    },
  ]),
  timeline: [
    {
      id: "anna-email-replay-access",
      sourceId: "mock-imap",
      sourceType: "imap",
      type: "email",
      occurredAt: "2026-03-08T00:00:00.000Z",
      display: {
        title: "Re: replay library access",
        summary:
          "Anna asked for clearer instructions on accessing the replay materials. Replied with a step-by-step the same day.",
      },
      body: createTextTimelineEventBody(
        "Anna asked for clearer instructions on accessing the replay materials. Replied with a step-by-step the same day.",
      ),
      sensitivityLevel: 0,
      parentEventId: null,
      author: null,
    },
    {
      id: "anna-form-intake",
      sourceId: "mock-forms",
      sourceType: "forms",
      type: "form",
      occurredAt: "2026-03-03T00:00:00.000Z",
      display: {
        title: "Intake form submitted",
        summary:
          "Highly personal answers stored — excluded from outbound personalization by default.",
      },
      body: createTextTimelineEventBody(
        "Highly personal answers stored — excluded from outbound personalization by default.",
      ),
      sensitivityLevel: 2,
      parentEventId: null,
      author: null,
    },
    {
      id: "anna-sent-monthly-check-in",
      sourceId: "mock-tinyops",
      sourceType: null,
      type: "sent",
      occurredAt: "2026-02-28T00:00:00.000Z",
      display: {
        title: "Monthly check-in (generic)",
        summary: "Sent via TinyOps · opened twice · no reply.",
      },
      body: createTextTimelineEventBody("Sent via TinyOps · opened twice · no reply."),
      sensitivityLevel: 0,
      parentEventId: null,
      author: null,
    },
    {
      id: "anna-email-welcome",
      sourceId: "mock-imap",
      sourceType: "imap",
      type: "email",
      occurredAt: "2026-02-12T00:00:00.000Z",
      display: {
        title: "Welcome to the March cohort",
        summary: "Onboarding email confirming course access and replay library.",
      },
      body: createTextTimelineEventBody(
        "Onboarding email confirming course access and replay library.",
      ),
      sensitivityLevel: 0,
      parentEventId: null,
      author: null,
    },
    {
      id: "anna-csv-import",
      sourceId: "mock-csv",
      sourceType: "csv",
      type: "csvimport",
      occurredAt: "2026-02-10T00:00:00.000Z",
      display: {
        title: "Imported from march-cohort.csv",
        summary: "Row 23 matched on email. Tagged: march-cohort, online.",
      },
      body: createTextTimelineEventBody(
        "Row 23 matched on email. Tagged: march-cohort, online.",
      ),
      sensitivityLevel: 0,
      parentEventId: null,
      author: null,
    },
  ],
}

/* ──────────────────────────────────────────────────────────────────────
 * Auto-generated detail for non-Anna clients — keeps every row meaningful.
 * ────────────────────────────────────────────────────────────────────── */

const LOCATIONS_BY_TLD: Record<string, string> = {
  jp: "Tokyo, JP",
  pl: "Warsaw, PL",
  fr: "Paris, FR",
  de: "Berlin, DE",
  pt: "Lisbon, PT",
  cz: "Prague, CZ",
  ie: "Dublin, IE",
  fi: "Helsinki, FI",
  se: "Stockholm, SE",
}

function locationFor(email: string): string {
  const tld = email.split(".").pop()!.toLowerCase()
  return LOCATIONS_BY_TLD[tld] ?? "Remote"
}

function joinedFor(cohort: string): string {
  if (cohort.startsWith("March")) return "Mar 1, 2026"
  if (cohort.startsWith("February")) return "Feb 1, 2026"
  if (cohort.startsWith("January")) return "Jan 12, 2026"
  return "2026"
}

function mockOccurredAt(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "2026-01-01T00:00:00.000Z"
  return date.toISOString()
}

function defaultDetail(c: Client): Omit<ClientDetail, keyof Client | "slug" | "id"> {
  const sourcesList = ["IMAP", c.sources >= 3 ? "Forms" : null, c.sources >= 4 ? "CSV" : null]
    .filter((s): s is string => Boolean(s))
  const summary = (() => {
    if (c.status === "dnc") {
      return `${c.name.split(" ")[0]} asked to be removed from outbound. Notes preserved for record-keeping; no further contact unless they reach out first.`
    }
    if (c.status === "inactive") {
      return `${c.name.split(" ")[0]} hasn't engaged since ${c.lastContact}. Most recent activity was ${c.lastEvent}. Worth a soft re-engagement when timing feels right.`
    }
    if (c.flags.includes("sensitive")) {
      return `${c.name.split(" ")[0]} is in the ${c.cohort.toLowerCase()} and shared sensitive context during intake. Outbound stays generic by default; manual review for anything specific.`
    }
    if (c.flags.includes("overdue")) {
      return `${c.name.split(" ")[0]} is in the ${c.cohort.toLowerCase()} and last heard from on ${c.lastContact}. A light check-in is overdue — keep it warm, no pressure.`
    }
    return `${c.name.split(" ")[0]} is active in the ${c.cohort.toLowerCase()}. Last contact ${c.lastContact}; latest event ${c.lastEvent}. Engagement looks healthy.`
  })()

  const sb = clientStatusBadge(c.status)
  const entries: { name: string; icon: PropertyIcon; value: ClientPropertyValue }[] = [
    {
      name: "Status",
      icon: "circle-dot",
      value: { kind: "status", statusKind: mockStatusKind(sb.kind), label: sb.label },
    },
    { name: "Cohort", icon: "hash", value: { kind: "tags", values: [c.cohort] } },
    { name: "Joined", icon: "calendar", value: { kind: "date", text: joinedFor(c.cohort) } },
    {
      name: "Last contact",
      icon: "send",
      value: {
        kind: "text",
        text: `${c.lastContact} · ${c.flags.includes("overdue") ? "monthly check-in (overdue)" : "monthly check-in"}`,
      },
    },
    {
      name: "Sources",
      icon: "plug",
      value: { kind: "tags", values: sourcesList },
    },
  ]

  if (c.status === "dnc") {
    entries.push({
      name: "Avoid",
      icon: "shield-alert",
      value: {
        kind: "text",
        text: "Client requested no outbound. Do not include in cohort blasts or check-ins.",
      },
    })
  } else if (c.flags.includes("sensitive")) {
    entries.push({
      name: "Avoid",
      icon: "shield-alert",
      value: {
        kind: "text",
        text: "Do not surface intake-form details in outbound personalization.",
      },
    })
  }

  const props = mockProps(entries)

  return {
    joined: joinedFor(c.cohort),
    location: locationFor(c.email),
    memory: {
      summary,
      confidence: c.status === "active" ? 0.62 : 0.41,
      lastGenerated: `Generated 1d ago, from ${c.sources * 2 + 1} events`,
    },
    properties: props,
    timeline: [
      {
        id: `${slugify(c.name)}-sent-check-in`,
        sourceId: "mock-tinyops",
        sourceType: null,
        type: "sent",
        occurredAt: mockOccurredAt(c.lastContact),
        display: {
          title: "Monthly check-in",
          summary: `Sent via TinyOps · ${c.flags.includes("overdue") ? "no reply" : "opened once"}.`,
        },
        body: createTextTimelineEventBody(
          `Sent via TinyOps · ${c.flags.includes("overdue") ? "no reply" : "opened once"}.`
        ),
        sensitivityLevel: 0,
        parentEventId: null,
        author: null,
      },
      {
        id: `${slugify(c.name)}-csv-import`,
        sourceId: "mock-csv",
        sourceType: "csv",
        type: "csvimport",
        occurredAt: mockOccurredAt(joinedFor(c.cohort)),
        display: {
          title: `Imported from ${c.cohort.toLowerCase().replace(" ", "-")}.csv`,
          summary: `Matched on email. Tagged: ${c.cohort.toLowerCase().replace(" ", "-")}.`,
        },
        body: createTextTimelineEventBody(
          `Matched on email. Tagged: ${c.cohort.toLowerCase().replace(" ", "-")}.`
        ),
        sensitivityLevel: 0,
        parentEventId: null,
        author: null,
      },
    ],
  }
}

/* ──────────────────────────────────────────────────────────────────────
 * Source list.
 * ────────────────────────────────────────────────────────────────────── */

const RAW_CLIENTS: Client[] = [
  {
    name: "Anna Smith",
    email: "anna@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 3,
    lastContact: "Feb 28",
    lastEvent: "8d ago",
    flags: ["overdue"],
  },
  {
    name: "Mariko Tan",
    email: "mariko.t@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 4,
    lastContact: "May 5",
    lastEvent: "3d ago",
    flags: [],
  },
  {
    name: "Luca De Rossi",
    email: "luca.derossi@gmail.com",
    cohort: "January cohort",
    status: "inactive",
    sources: 2,
    lastContact: "Mar 30",
    lastEvent: "5w ago",
    flags: ["idle"],
  },
  {
    name: "Sara Berger",
    email: "s.berger@example.de",
    cohort: "March cohort",
    status: "sensitive",
    sources: 5,
    lastContact: "May 6",
    lastEvent: "2d ago",
    flags: ["sensitive"],
  },
  {
    name: "Priya Raman",
    email: "priya@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 3,
    lastContact: "May 7",
    lastEvent: "yesterday",
    flags: [],
  },
  {
    name: "Tomás Álvarez",
    email: "tomas.a@example.com",
    cohort: "February cohort",
    status: "active",
    sources: 3,
    lastContact: "Apr 22",
    lastEvent: "16d ago",
    flags: ["overdue"],
  },
  {
    name: "Hana Nakamura",
    email: "hana.n@example.jp",
    cohort: "March cohort",
    status: "active",
    sources: 2,
    lastContact: "May 1",
    lastEvent: "7d ago",
    flags: [],
  },
  {
    name: "Daniel Okafor",
    email: "d.okafor@example.com",
    cohort: "February cohort",
    status: "active",
    sources: 4,
    lastContact: "Apr 18",
    lastEvent: "20d ago",
    flags: ["overdue"],
  },
  {
    name: "Eve Kowalski",
    email: "eve.k@example.pl",
    cohort: "January cohort",
    status: "dnc",
    sources: 1,
    lastContact: "Jan 12",
    lastEvent: "16w ago",
    flags: ["dnc"],
  },
  {
    name: "Faisal Rahman",
    email: "faisal@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 3,
    lastContact: "May 4",
    lastEvent: "4d ago",
    flags: [],
  },
  {
    name: "Greta Lindqvist",
    email: "greta@example.se",
    cohort: "February cohort",
    status: "inactive",
    sources: 2,
    lastContact: "Feb 09",
    lastEvent: "12w ago",
    flags: ["idle"],
  },
  {
    name: "Hugo Bernard",
    email: "hugo.b@example.fr",
    cohort: "March cohort",
    status: "active",
    sources: 4,
    lastContact: "May 6",
    lastEvent: "2d ago",
    flags: [],
  },
  {
    name: "Ines Costa",
    email: "ines.c@example.pt",
    cohort: "March cohort",
    status: "sensitive",
    sources: 4,
    lastContact: "Apr 30",
    lastEvent: "8d ago",
    flags: ["sensitive", "overdue"],
  },
  {
    name: "Jakob Weiss",
    email: "j.weiss@example.de",
    cohort: "January cohort",
    status: "inactive",
    sources: 2,
    lastContact: "Feb 02",
    lastEvent: "14w ago",
    flags: ["idle"],
  },
  {
    name: "Kalani Mahoe",
    email: "kalani@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 3,
    lastContact: "May 3",
    lastEvent: "5d ago",
    flags: [],
  },
  {
    name: "Liam O'Connor",
    email: "liam@example.ie",
    cohort: "February cohort",
    status: "active",
    sources: 3,
    lastContact: "Apr 25",
    lastEvent: "13d ago",
    flags: ["overdue"],
  },
  {
    name: "Mei Chen",
    email: "mei.chen@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 4,
    lastContact: "May 6",
    lastEvent: "2d ago",
    flags: [],
  },
  {
    name: "Noor Hassan",
    email: "noor.h@example.com",
    cohort: "March cohort",
    status: "active",
    sources: 2,
    lastContact: "Apr 28",
    lastEvent: "10d ago",
    flags: [],
  },
  {
    name: "Otto Lindgren",
    email: "otto@example.fi",
    cohort: "February cohort",
    status: "inactive",
    sources: 1,
    lastContact: "Mar 11",
    lastEvent: "8w ago",
    flags: ["idle"],
  },
  {
    name: "Petra Novak",
    email: "p.novak@example.cz",
    cohort: "March cohort",
    status: "active",
    sources: 3,
    lastContact: "May 2",
    lastEvent: "6d ago",
    flags: [],
  },
]

/* ──────────────────────────────────────────────────────────────────────
 * Build the detail list once. Slugs are deterministic + deduped.
 * ────────────────────────────────────────────────────────────────────── */

function buildDetails(rows: Client[]): ClientDetail[] {
  const used = new Set<string>()
  return rows.map((c) => {
    let slug = slugify(c.name)
    if (used.has(slug)) {
      let i = 2
      while (used.has(`${slug}-${i}`)) i += 1
      slug = `${slug}-${i}`
    }
    used.add(slug)
    const detail =
      c.name === "Anna Smith"
        ? { ...ANNA_DETAIL }
        : defaultDetail(c)
    return { ...c, id: slug, slug, ...detail }
  })
}

export const ALL_CLIENTS: ClientDetail[] = buildDetails(RAW_CLIENTS)

export const RECENT_CLIENTS: ClientDetail[] = ALL_CLIENTS.slice(0, 5)

export const COHORTS = [
  "All cohorts",
  "March cohort",
  "February cohort",
  "January cohort",
] as const

export type CohortFilter = (typeof COHORTS)[number]

const BY_SLUG: Record<string, ClientDetail> = Object.fromEntries(
  ALL_CLIENTS.map((c) => [c.slug, c])
)

export function clientBySlug(slug: string): ClientDetail | undefined {
  return BY_SLUG[slug]
}

export type MockClientMemoryRepositoryOptions = {
  clients?: ClientDetail[]
}

export function createMockClientMemoryRepository({
  clients = ALL_CLIENTS,
}: MockClientMemoryRepositoryOptions = {}): ClientMemoryRepositoryPort {
  return {
    async listClients() {
      return [...clients]
    },
    async getRecentClients(limit = 5) {
      return clients.slice(0, limit)
    },
    async findClientBySlug(slug) {
      return clients.find((client) => client.slug === slug) ?? null
    },
  }
}

export const mockClientMemoryRepository = createMockClientMemoryRepository()
