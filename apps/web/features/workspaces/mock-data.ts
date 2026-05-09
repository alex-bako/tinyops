import type {
  JoinableWorkspace,
  Workspace,
  WorkspaceUsageSnapshot,
} from "@/features/workspaces/types"

export const WORKSPACES: Workspace[] = [
  {
    id: "jamie-practice",
    name: "Jamie's practice",
    handle: "jamie-practice",
    description:
      "Sexual therapy practice — sensitive content, manual review enforced.",
    icon: { kind: "mark" },
    accent: "cobalt",
    role: "owner",
    plan: { tier: "Solo", price: "$29 / mo", seats: 1 },
    sensitivity: {
      mode: "strict",
      autoSendThreshold: "low-only",
      manualReviewKeywords: [
        "trauma",
        "abuse",
        "grief",
        "medication",
        "crisis",
      ],
      excludeFromOutbound: true,
    },
    members: [
      {
        id: "u1",
        name: "Jamie Park",
        email: "jamie@yourpractice.com",
        role: "owner",
        you: true,
        joinedAt: "Founder · Jan 2024",
        lastActiveAt: "Now",
      },
    ],
    invites: [],
  },
  {
    id: "course-lab",
    name: "Replay Lab",
    handle: "replay-lab",
    description:
      "Online course — replay access, intake forms, monthly digests to 2,300 students.",
    icon: { kind: "letter", letter: "R", tone: "citron" },
    accent: "citron",
    role: "admin",
    plan: { tier: "Team", price: "$89 / mo", seats: 5 },
    sensitivity: {
      mode: "balanced",
      autoSendThreshold: "low-and-medium",
      manualReviewKeywords: ["refund", "chargeback", "legal"],
      excludeFromOutbound: false,
    },
    members: [
      {
        id: "u1",
        name: "Jamie Park",
        email: "jamie@yourpractice.com",
        role: "admin",
        you: true,
        joinedAt: "Mar 2024",
        lastActiveAt: "Now",
      },
      {
        id: "u2",
        name: "Devon Nguyen",
        email: "devon@replaylab.com",
        role: "owner",
        joinedAt: "Founder",
        lastActiveAt: "12m ago",
      },
      {
        id: "u3",
        name: "Sara Berger",
        email: "sara@replaylab.com",
        role: "operator",
        joinedAt: "Apr 2024",
        lastActiveAt: "Yesterday",
      },
      {
        id: "u4",
        name: "Mariko Tan",
        email: "mariko@replaylab.com",
        role: "reviewer",
        joinedAt: "Sep 2024",
        lastActiveAt: "3d ago",
      },
    ],
    invites: [
      {
        id: "invite-replay-alex",
        email: "alex@replaylab.com",
        role: "operator",
        createdAt: "2 days ago",
        invitedByEmail: "Devon Nguyen",
      },
    ],
  },
  {
    id: "bloom-coaching",
    name: "Bloom Coaching",
    handle: "bloom",
    description:
      "Group coaching collective — three coaches, shared client roster.",
    icon: { kind: "letter", letter: "B", tone: "mint" },
    accent: "mint",
    role: "operator",
    plan: { tier: "Team", price: "$89 / mo", seats: 5 },
    sensitivity: {
      mode: "balanced",
      autoSendThreshold: "low-and-medium",
      manualReviewKeywords: ["medical", "insurance"],
      excludeFromOutbound: true,
    },
    members: [
      {
        id: "u1",
        name: "Jamie Park",
        email: "jamie@yourpractice.com",
        role: "operator",
        you: true,
        joinedAt: "Feb 2025",
        lastActiveAt: "Now",
      },
      {
        id: "u2",
        name: "Priya Raman",
        email: "priya@bloom.coach",
        role: "owner",
        joinedAt: "Founder",
        lastActiveAt: "1h ago",
      },
      {
        id: "u3",
        name: "Luca De Rossi",
        email: "luca@bloom.coach",
        role: "admin",
        joinedAt: "Feb 2025",
        lastActiveAt: "Yesterday",
      },
    ],
    invites: [],
  },
]

export const WORKSPACE_USAGE_BY_ID: Record<string, WorkspaceUsageSnapshot> = {
  "jamie-practice": {
    counts: { clients: 142, sources: 4, drafts: 3 },
    sidebarCounts: { clients: 142, tasks: 3, march: 47, feedback: 12, dnc: 3 },
  },
  "course-lab": {
    counts: { clients: 2347, sources: 6, drafts: 18 },
    sidebarCounts: {
      clients: 2347,
      tasks: 18,
      march: 312,
      feedback: 64,
      dnc: 8,
    },
  },
  "bloom-coaching": {
    counts: { clients: 480, sources: 3, drafts: 7 },
    sidebarCounts: { clients: 480, tasks: 7, march: 84, feedback: 22, dnc: 1 },
  },
}

export const JOINABLE_WORKSPACES: JoinableWorkspace[] = [
  {
    invitationId: "invite-studio-practice",
    workspaceId: "studio-practice",
    name: "Studio practice",
    handle: "studio",
    icon: { kind: "letter", letter: "S", tone: "coral" },
    members: 6,
    role: "admin",
    invitedByEmail: "anna@example.co",
  },
]
