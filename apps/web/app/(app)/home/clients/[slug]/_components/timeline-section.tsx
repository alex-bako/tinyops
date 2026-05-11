"use client"

import * as React from "react"
import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
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
  const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(
    () => new Set()
  )

  function toggleExpanded(eventKey: string) {
    setExpandedKeys((current) => {
      const next = new Set(current)
      if (next.has(eventKey)) {
        next.delete(eventKey)
      } else {
        next.add(eventKey)
      }
      return next
    })
  }

  return (
    <Timeline>
      {events.map((e) => {
        const expanded = expandedKeys.has(e.eventKey)
        return (
          <TimelineEvent key={e.eventKey} tone={e.tone} sensitive={e.sensitive}>
            <TimelineHead>
              <TimelineSrc>{e.sourceLabel}</TimelineSrc>
              <TimelineDate>{e.date}</TimelineDate>
            </TimelineHead>
            <TimelineTitle>{e.title}</TimelineTitle>
            <TimelineSummary>{e.summary}</TimelineSummary>
            <div className="mt-2">
              <Button
                type="button"
                variant="tertiary"
                size="iaction"
                aria-expanded={expanded}
                onClick={() => toggleExpanded(e.eventKey)}
              >
                {expanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
                {expanded ? e.expandedLabel : e.collapsedLabel}
              </Button>
            </div>
            {expanded ? (
              <div className="mt-2 max-h-72 overflow-auto rounded-sm border border-border bg-muted/40 p-3 text-[13px] leading-[1.55] whitespace-pre-wrap text-foreground">
                {e.detailText}
              </div>
            ) : null}
          </TimelineEvent>
        )
      })}
    </Timeline>
  )
}
