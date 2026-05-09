import {
  Timeline,
  TimelineDate,
  TimelineEvent,
  TimelineHead,
  TimelineSrc,
  TimelineSummary,
  TimelineTitle,
} from "@workspace/ui/components/timeline"

import type { ClientTimelineEventView } from "../_view-model"

export function TimelineSection({
  events,
}: {
  events: ClientTimelineEventView[]
}) {
  return (
    <Timeline>
      {events.map((e, i) => (
        <TimelineEvent
          key={`${e.date}-${i}`}
          tone={e.tone}
          sensitive={e.sensitive}
        >
          <TimelineHead>
            <TimelineSrc>{e.sourceLabel}</TimelineSrc>
            <TimelineDate>{e.date}</TimelineDate>
          </TimelineHead>
          <TimelineTitle>{e.title}</TimelineTitle>
          <TimelineSummary>{e.summary}</TimelineSummary>
        </TimelineEvent>
      ))}
    </Timeline>
  )
}
