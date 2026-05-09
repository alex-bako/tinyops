import {
  clientDetailFlagBadges,
  clientStatusBadge,
  type ClientStateBadge,
} from "@/lib/client-state"

export type ClientStatus = "active" | "inactive" | "sensitive" | "dnc"

export type ClientFlag = "overdue" | "sensitive" | "idle" | "dnc"

export type Client = {
  name: string
  email: string
  cohort: string
  status: ClientStatus
  sources: number
  lastContact: string
  lastEvent: string
  flags: ClientFlag[]
}

/* ──────────────────────────────────────────────────────────────────────
 * Detail-page extensions (mock-only).
 * ────────────────────────────────────────────────────────────────────── */

export type ClientMemory = {
  summary: string
  confidence: number // 0..1
  lastGenerated: string // e.g. "Generated 2h ago, from 9 events"
}

export type PropertyIcon =
  | "circle-dot"
  | "hash"
  | "calendar"
  | "send"
  | "plug"
  | "target"
  | "activity"
  | "wand"
  | "shield-check"
  | "shield-alert"
  | "mail"
  | "user"
  | "map-pin"

export type ClientPropertyValue =
  | { kind: "text"; value: string }
  | { kind: "tags"; values: string[] }
  | { kind: "badge"; variant: "active" | "neutral" | "warn" | "sensitive" | "dnc"; label: string; dot?: boolean }
  | { kind: "tag-and-text"; tag: string; text: string }
  | { kind: "italic"; value: string }

export type ClientProperty = {
  key: string
  icon: PropertyIcon
  value: ClientPropertyValue
  avoid?: boolean
}

export type TimelineEventType = "email" | "form" | "sent" | "csvimport"

export type ClientTimelineEvent = {
  type: TimelineEventType
  date: string
  title: string
  summary: string
  sensitive?: boolean
}

export type ClientBadge = ClientStateBadge

export type ClientDetail = Client & {
  slug: string
  joined: string
  location: string
  badges: ClientBadge[]
  memory: ClientMemory
  properties: ClientProperty[]
  timeline: ClientTimelineEvent[]
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

const ANNA_DETAIL: Omit<ClientDetail, keyof Client | "slug"> = {
  joined: "Feb 12, 2026",
  location: "Berlin, DE",
  badges: [
    { kind: "active", label: "Active" },
    { kind: "neutral", label: "March cohort" },
    { kind: "warn", label: "Overdue check-in" },
  ],
  memory: {
    summary:
      "Anna joined the March cohort and has mainly interacted about accessing recordings and completing exercises. She asked for clearer replay instructions on Mar 8 and hasn't submitted feedback in six weeks.",
    confidence: 0.78,
    lastGenerated: "Generated 2h ago, from 9 events",
  },
  properties: [
    {
      key: "Status",
      icon: "circle-dot",
      value: { kind: "badge", variant: "active", label: "Active", dot: true },
    },
    {
      key: "Cohort",
      icon: "hash",
      value: { kind: "tags", values: ["March cohort"] },
    },
    {
      key: "Joined",
      icon: "calendar",
      value: { kind: "text", value: "Feb 12, 2026" },
    },
    {
      key: "Last contact",
      icon: "send",
      value: {
        kind: "tag-and-text",
        tag: "Feb 28, 2026",
        text: "monthly check-in (generic)",
      },
    },
    {
      key: "Sources",
      icon: "plug",
      value: { kind: "tags", values: ["IMAP", "Forms", "CSV"] },
    },
    {
      key: "Original goal",
      icon: "target",
      value: {
        kind: "text",
        value:
          "Wanted structured guidance and practical exercises to improve communication in her relationship.",
      },
    },
    {
      key: "Current progress",
      icon: "activity",
      value: {
        kind: "text",
        value:
          "Engaging with course materials but no submitted feedback in 6 weeks.",
      },
    },
    {
      key: "Recommended action",
      icon: "wand",
      value: {
        kind: "tag-and-text",
        tag: "Overdue",
        text: "Send a light monthly check-in asking how the exercises have been going.",
      },
    },
    {
      key: "Safe personalization",
      icon: "shield-check",
      value: {
        kind: "italic",
        value: "Hope the replay materials have been helpful so far.",
      },
    },
    {
      key: "Avoid",
      icon: "shield-alert",
      value: {
        kind: "text",
        value:
          "Do not mention intimate relationship details from the intake form.",
      },
      avoid: true,
    },
  ],
  timeline: [
    {
      type: "email",
      date: "Mar 8",
      title: "Re: replay library access",
      summary:
        "Anna asked for clearer instructions on accessing the replay materials. Replied with a step-by-step the same day.",
    },
    {
      type: "form",
      date: "Mar 3",
      sensitive: true,
      title: "Intake form submitted",
      summary:
        "Highly personal answers stored — excluded from outbound personalization by default.",
    },
    {
      type: "sent",
      date: "Feb 28",
      title: "Monthly check-in (generic)",
      summary: "Sent via TinyOps · opened twice · no reply.",
    },
    {
      type: "email",
      date: "Feb 12",
      title: "Welcome to the March cohort",
      summary:
        "Onboarding email confirming course access and replay library.",
    },
    {
      type: "csvimport",
      date: "Feb 10",
      title: "Imported from march-cohort.csv",
      summary: "Row 23 matched on email. Tagged: march-cohort, online.",
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

function defaultDetail(c: Client): Omit<ClientDetail, keyof Client | "slug"> {
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
  const props: ClientProperty[] = [
    {
      key: "Status",
      icon: "circle-dot",
      value: {
        kind: "badge",
        variant: sb.kind,
        label: sb.label,
        dot: sb.dot,
      },
    },
    { key: "Cohort", icon: "hash", value: { kind: "tags", values: [c.cohort] } },
    { key: "Joined", icon: "calendar", value: { kind: "text", value: joinedFor(c.cohort) } },
    {
      key: "Last contact",
      icon: "send",
      value: {
        kind: "tag-and-text",
        tag: c.lastContact,
        text: c.flags.includes("overdue") ? "monthly check-in (overdue)" : "monthly check-in",
      },
    },
    {
      key: "Sources",
      icon: "plug",
      value: { kind: "tags", values: sourcesList },
    },
  ]

  if (c.status === "dnc") {
    props.push({
      key: "Avoid",
      icon: "shield-alert",
      value: {
        kind: "text",
        value: "Client requested no outbound. Do not include in cohort blasts or check-ins.",
      },
      avoid: true,
    })
  } else if (c.flags.includes("sensitive")) {
    props.push({
      key: "Avoid",
      icon: "shield-alert",
      value: {
        kind: "text",
        value: "Do not surface intake-form details in outbound personalization.",
      },
      avoid: true,
    })
  }

  return {
    joined: joinedFor(c.cohort),
    location: locationFor(c.email),
    badges: [
      clientStatusBadge(c.status),
      { kind: "neutral", label: c.cohort },
      ...clientDetailFlagBadges(c.flags),
    ],
    memory: {
      summary,
      confidence: c.status === "active" ? 0.62 : 0.41,
      lastGenerated: `Generated 1d ago, from ${c.sources * 2 + 1} events`,
    },
    properties: props,
    timeline: [
      {
        type: "sent",
        date: c.lastContact,
        title: "Monthly check-in",
        summary: `Sent via TinyOps · ${c.flags.includes("overdue") ? "no reply" : "opened once"}.`,
      },
      {
        type: "csvimport",
        date: joinedFor(c.cohort),
        title: `Imported from ${c.cohort.toLowerCase().replace(" ", "-")}.csv`,
        summary: `Matched on email. Tagged: ${c.cohort.toLowerCase().replace(" ", "-")}.`,
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
    return { ...c, slug, ...detail }
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
