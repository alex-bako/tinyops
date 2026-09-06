import type { ClientTimelineEventView } from "./timeline-presentation"

/** Synthetic correspondence for timeline regression tests and visual checks. */
export const imapTimelineFixture: ClientTimelineEventView[] = [
  {
    eventKey: "imap-new-conversation",
    sourceId: "fixture-mailbox",
    sourceType: "imap",
    type: "sent",
    date: "May 7, 2026, 11:00 UTC",
    title: "Next appointment",
    summary: "",
    bodyItems: [
      {
        kind: "text",
        text: "Hi Anna, would Tuesday at 10:00 work for our next appointment?",
      },
    ],
    sensitive: false,
    tone: "attention",
    sourceLabel: "sent",
  },
  {
    eventKey: "imap-reply",
    sourceId: "fixture-mailbox",
    sourceType: "imap",
    type: "sent",
    date: "May 7, 2026, 10:00 UTC",
    title: "Replay access",
    summary: "",
    bodyItems: [
      {
        kind: "text",
        text: "Hi Anna, I resent the replay library link. Let me know if you need anything else.",
      },
    ],
    sensitive: false,
    tone: "attention",
    sourceLabel: "sent",
  },
  {
    eventKey: "imap-incoming",
    sourceId: "fixture-mailbox",
    sourceType: "imap",
    type: "email",
    date: "May 7, 2026, 08:00 UTC",
    title: "Replay access",
    summary: "",
    bodyItems: [
      {
        kind: "text",
        text: "Hello, could you resend the replay library link? Thank you, Anna.",
      },
    ],
    sensitive: false,
    tone: "brand",
    sourceLabel: "email",
  },
]
