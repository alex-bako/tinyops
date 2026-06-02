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
      {events.map((e) => {
        const hasBody = e.bodyItems.length > 0
        return (
          <TimelineEvent key={e.eventKey} tone={e.tone} sensitive={e.sensitive}>
            <TimelineHead>
              <TimelineSrc>{e.sourceLabel}</TimelineSrc>
              <TimelineDate>{e.date}</TimelineDate>
            </TimelineHead>
            <TimelineTitle>{e.title}</TimelineTitle>
            {hasBody ? (
              <TimelineBody event={e} />
            ) : (
              <TimelineSummary>{e.summary}</TimelineSummary>
            )}
          </TimelineEvent>
        )
      })}
    </Timeline>
  )
}

function TimelineBody({ event }: { event: ClientTimelineEventView }) {
  return (
    <div className="mt-1.5 max-w-[64ch] space-y-3 text-[13px] leading-[1.55] text-slate-700">
      {event.bodyItems.map((block, index) => {
        if (block.kind === "text") {
          return (
            <p
              key={`${event.eventKey}-text-${index}`}
              className="m-0 whitespace-pre-wrap break-words"
            >
              {block.text}
            </p>
          )
        }

        return (
          <div
            key={`${event.eventKey}-qa-${index}`}
            className="space-y-0.5"
          >
            <p className="m-0 font-medium text-foreground">{block.question}</p>
            <p className="m-0 whitespace-pre-wrap break-words">{block.answer}</p>
          </div>
        )
      })}
    </div>
  )
}
