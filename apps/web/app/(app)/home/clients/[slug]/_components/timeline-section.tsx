"use client"

import { useState } from "react"
import {
  CalendarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  StickyNoteIcon,
} from "lucide-react"
import { SourceIcon } from "@/components/source-icon"
import {
  getConnectorMetadata,
  isConnectorId,
} from "@/features/data-sources/connector-metadata"

import {
  groupTimelineEvents,
  type ClientTimelineGroup,
} from "@/features/clients/application/timeline-presentation"
import { Button } from "@workspace/ui/components/button"

import { Badge } from "@workspace/ui/components/badge"
import {
  Timeline,
  TimelineDate,
  TimelineEvent,
  TimelineHead,
  TimelineSrc,
  TimelineSummary,
  TimelineTitle,
} from "@workspace/ui/components/timeline"

import type {
  ClientTimelineEventView,
  TimelineEventNotesMap,
} from "../_view-model"
import { EventNotes } from "./event-notes"

type TimelineSectionProps = {
  events: ClientTimelineEventView[]
  notesOnEvents?: boolean
  eventNotes?: TimelineEventNotesMap
  clientId?: string
  canManageNotes?: boolean
  currentUserName?: string | null
  onTurnOnNotes?: () => void
}

export function TimelineSection({ events, ...props }: TimelineSectionProps) {
  return (
    <Timeline>
      {groupTimelineEvents(events).map((group) => (
        <TimelineGroup key={group.key} group={group} {...props} />
      ))}
    </Timeline>
  )
}

function TimelineGroup({
  group,
  notesOnEvents = false,
  eventNotes = {},
  clientId = "",
  canManageNotes = false,
  currentUserName = null,
  onTurnOnNotes,
}: Omit<TimelineSectionProps, "events"> & { group: ClientTimelineGroup }) {
  const latest = group.events[0]
  const [selection, setSelection] = useState<{
    latestKey: string
    eventKey: string
  } | null>(null)
  const index =
    selection?.latestKey === latest.eventKey
      ? Math.max(
          0,
          group.events.findIndex(
            (event) => event.eventKey === selection.eventKey
          )
        )
      : 0
  const e = group.events[index] ?? latest
  const hasBody = e.bodyItems.length > 0
  const notes = eventNotes[e.eventKey] ?? []

  function select(nextIndex: number) {
    const next = group.events[nextIndex]
    if (next)
      setSelection({ latestKey: latest.eventKey, eventKey: next.eventKey })
  }

  return (
    <TimelineEvent tone={e.tone} sensitive={e.sensitive}>
      <TimelineEventHeader
        event={e}
        noteCount={notes.length}
        notesOnEvents={notesOnEvents}
        onTurnOnNotes={onTurnOnNotes}
      />
      {hasBody ? (
        <TimelineBody event={e} />
      ) : e.summary ? (
        <TimelineSummary>{e.summary}</TimelineSummary>
      ) : null}
      {notesOnEvents
        ? group.events.map((submission) => (
            // Keep note editors mounted so drafts and optimistic state survive navigation.
            <div
              key={submission.eventKey}
              hidden={submission.eventKey !== e.eventKey}
            >
              <EventNotes
                clientId={clientId}
                eventId={submission.eventKey}
                notes={eventNotes[submission.eventKey] ?? []}
                canManage={canManageNotes}
                currentUserName={currentUserName}
              />
            </div>
          ))
        : null}
      {group.events.length > 1 ? (
        <div className="mt-4 flex justify-end">
          <div
            role="group"
            aria-label="Form submissions"
            className="inline-flex max-w-full items-center gap-0.5 rounded-md border border-border bg-muted/30 p-0.5 text-muted-foreground"
          >
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              aria-label="Previous submission"
              title="Previous submission"
              disabled={index === group.events.length - 1}
              onClick={() => select(index + 1)}
            >
              <ChevronLeftIcon aria-hidden="true" className="size-3.5" />
            </Button>
            <span
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="min-w-0 px-1 text-center text-[11px] tabular-nums"
            >
              Submission {group.events.length - index} of {group.events.length}
              {index === 0 ? " · Latest" : ""}
            </span>
            <Button
              type="button"
              variant="tertiary"
              size="icon"
              aria-label="Next submission"
              title="Next submission"
              disabled={index === 0}
              onClick={() => select(index - 1)}
            >
              <ChevronRightIcon aria-hidden="true" className="size-3.5" />
            </Button>
          </div>
        </div>
      ) : null}
    </TimelineEvent>
  )
}

function TimelineEventHeader({
  event: e,
  noteCount,
  notesOnEvents,
  onTurnOnNotes,
}: {
  event: ClientTimelineEventView
  noteCount: number
  notesOnEvents: boolean
  onTurnOnNotes?: () => void
}) {
  const source =
    e.sourceType && isConnectorId(e.sourceType)
      ? getConnectorMetadata(e.sourceType)
      : null
  return (
    <TimelineHead className="items-center gap-y-1.5">
      {e.title ? (
        <TimelineTitle className="mt-0 min-w-0 break-words">
          {e.title}
        </TimelineTitle>
      ) : (
        <TimelineSrc>{e.sourceLabel}</TimelineSrc>
      )}
      {e.sourceType ? (
        <Badge variant="neutral" className="gap-1 text-[11px] [&>svg]:size-3.5">
          <SourceIcon icon={source?.icon ?? "plug"} className="size-3.5" />
          {source?.title ?? "Unknown source"}
        </Badge>
      ) : null}
      {e.title && e.sensitive ? <TimelineSrc>sensitive</TimelineSrc> : null}
      {!notesOnEvents && noteCount > 0 ? (
        <button
          type="button"
          onClick={onTurnOnNotes}
          title="Show notes on events"
          className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-px font-mono text-[10.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <StickyNoteIcon className="size-2.5" /> {noteCount}
        </button>
      ) : null}
      <TimelineDate className="inline-flex items-center gap-1.5">
        <CalendarIcon aria-hidden="true" className="size-3.5 shrink-0" />
        {e.date}
      </TimelineDate>
    </TimelineHead>
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
              className="m-0 break-words whitespace-pre-wrap"
            >
              {block.text}
            </p>
          )
        }

        if (block.kind === "tags") {
          return (
            <div key={`${event.eventKey}-tags-${index}`} className="space-y-1">
              <p className="m-0 font-medium text-foreground">{block.label}</p>
              <div className="flex flex-wrap gap-1">
                {block.values.map((value) => (
                  <Badge
                    key={value}
                    variant="tag"
                    className="whitespace-normal"
                  >
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
          )
        }

        return (
          <div key={`${event.eventKey}-qa-${index}`} className="space-y-0.5">
            <p className="m-0 font-medium text-foreground">{block.question}</p>
            <p className="m-0 break-words whitespace-pre-wrap">
              {block.answer}
            </p>
          </div>
        )
      })}
    </div>
  )
}
