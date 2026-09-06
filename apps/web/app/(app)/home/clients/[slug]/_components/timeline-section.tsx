"use client"

import { StickyNoteIcon } from "lucide-react"
import { SourceIcon } from "@/components/source-icon"
import {
  getConnectorMetadata,
  isConnectorId,
} from "@/features/data-sources/connector-metadata"

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

import type { ClientTimelineEventView, TimelineEventNotesMap } from "../_view-model"
import { EventNotes } from "./event-notes"

export function TimelineSection({
  events,
  notesOnEvents = false,
  eventNotes = {},
  clientId = "",
  canManageNotes = false,
  currentUserName = null,
  onTurnOnNotes,
}: {
  events: ClientTimelineEventView[]
  notesOnEvents?: boolean
  eventNotes?: TimelineEventNotesMap
  clientId?: string
  canManageNotes?: boolean
  currentUserName?: string | null
  onTurnOnNotes?: () => void
}) {
  return (
    <Timeline>
      {events.map((e) => {
        const hasBody = e.bodyItems.length > 0
        const notes = eventNotes[e.eventKey] ?? []
        const source = e.sourceType && isConnectorId(e.sourceType)
          ? getConnectorMetadata(e.sourceType)
          : null
        return (
          <TimelineEvent key={e.eventKey} tone={e.tone} sensitive={e.sensitive}>
            <TimelineHead>
              <TimelineSrc>{e.sourceLabel}</TimelineSrc>
              {e.sourceType ? (
                <Badge variant="neutral" className="gap-1 text-[11px] [&>svg]:size-3.5">
                  <SourceIcon icon={source?.icon ?? "plug"} className="size-3.5" />
                  {source?.title ?? "Unknown source"}
                </Badge>
              ) : null}
              {!notesOnEvents && notes.length > 0 ? (
                <button
                  type="button"
                  onClick={onTurnOnNotes}
                  title="Show notes on events"
                  className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-px font-mono text-[10.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <StickyNoteIcon className="size-2.5" /> {notes.length}
                </button>
              ) : null}
              <TimelineDate>{e.date}</TimelineDate>
            </TimelineHead>
            {e.title ? <TimelineTitle>{e.title}</TimelineTitle> : null}
            {hasBody ? (
              <TimelineBody event={e} />
            ) : (
              <TimelineSummary>{e.summary}</TimelineSummary>
            )}
            {notesOnEvents ? (
              <EventNotes
                clientId={clientId}
                eventId={e.eventKey}
                notes={notes}
                canManage={canManageNotes}
                currentUserName={currentUserName}
              />
            ) : null}
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

        if (block.kind === "tags") {
          return (
            <div key={`${event.eventKey}-tags-${index}`} className="space-y-1">
              <p className="m-0 font-medium text-foreground">{block.label}</p>
              <div className="flex flex-wrap gap-1">
                {block.values.map((value) => (
                  <Badge key={value} variant="tag" className="whitespace-normal">
                    {value}
                  </Badge>
                ))}
              </div>
            </div>
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
