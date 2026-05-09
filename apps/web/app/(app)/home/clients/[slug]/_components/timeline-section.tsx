import {
  Timeline,
  TimelineDate,
  TimelineEvent,
  TimelineHead,
  TimelineSrc,
  TimelineSummary,
  TimelineTitle,
  type TimelineTone,
} from "@workspace/ui/components/timeline"

import type { ClientTimelineEvent, TimelineEventType } from "@/lib/clients"

const TONE_OF: Record<TimelineEventType, TimelineTone> = {
  email: "brand",
  form: "positive",
  sent: "attention",
  csvimport: "neutral",
}

const LABEL_OF: Record<TimelineEventType, string> = {
  email: "email",
  form: "form",
  sent: "sent",
  csvimport: "csv import",
}

export function TimelineSection({ events }: { events: ClientTimelineEvent[] }) {
  return (
    <Timeline>
      {events.map((e, i) => (
        <TimelineEvent
          key={`${e.date}-${i}`}
          tone={TONE_OF[e.type]}
          sensitive={e.sensitive}
        >
          <TimelineHead>
            <TimelineSrc>
              {LABEL_OF[e.type]}
              {e.sensitive ? " · sensitive" : ""}
            </TimelineSrc>
            <TimelineDate>{e.date}</TimelineDate>
          </TimelineHead>
          <TimelineTitle>{e.title}</TimelineTitle>
          <TimelineSummary>{e.summary}</TimelineSummary>
        </TimelineEvent>
      ))}
    </Timeline>
  )
}
