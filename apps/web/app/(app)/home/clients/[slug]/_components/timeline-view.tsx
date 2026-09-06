"use client"

import * as React from "react"
import { EyeIcon, EyeOffIcon, FilterXIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { SectionHead } from "@workspace/ui/components/section"
import { Switch } from "@workspace/ui/components/switch"
import { cn } from "@workspace/ui/lib/utils"

import { groupTimelineEvents } from "@/features/clients/application/timeline-presentation"
import type { TimelineEventType } from "@/features/clients/domain/client-profile"

import type { ClientTimelineEventView, TimelineEventNotesMap } from "../_view-model"
import { TimelineFilter } from "./timeline-filter"
import { TimelineSection } from "./timeline-section"

export function TimelineView({
  events,
  eventNotes,
  clientId,
  canManageNotes,
  currentUserName,
}: {
  events: ClientTimelineEventView[]
  eventNotes: TimelineEventNotesMap
  clientId: string
  canManageNotes: boolean
  currentUserName: string | null
}) {
  const allTypes = React.useMemo(() => {
    const seen: TimelineEventType[] = []
    for (const event of events) {
      if (!seen.includes(event.type)) seen.push(event.type)
    }
    return seen
  }, [events])

  const [activeTypes, setActiveTypes] = React.useState<
    ReadonlySet<TimelineEventType>
  >(() => new Set(allTypes))
  const [hideSensitive, setHideSensitive] = React.useState(false)
  const [notesOnEvents, setNotesOnEvents] = React.useState(false)

  const toggleType = React.useCallback((type: TimelineEventType) => {
    setActiveTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }, [])

  const reset = React.useCallback(() => {
    setActiveTypes(new Set(allTypes))
    setHideSensitive(false)
  }, [allTypes])

  const countByType = React.useCallback(
    (type: TimelineEventType) =>
      groupTimelineEvents(events.filter((event) =>
        event.type === type && !(hideSensitive && event.sensitive)
      )).length,
    [events, hideSensitive]
  )

  const visibleEvents = events.filter(
    (event) =>
      activeTypes.has(event.type) && !(hideSensitive && event.sensitive)
  )

  const eventNoteCount = Object.values(eventNotes).reduce(
    (total, notes) => total + notes.length,
    0
  )

  const itemCount = groupTimelineEvents(events).length
  const visibleItemCount = groupTimelineEvents(visibleEvents).length
  const countLabel = [
    `${itemCount} timeline ${itemCount === 1 ? "item" : "items"}`,
    visibleEvents.length !== events.length
      ? `${visibleItemCount} shown`
      : null,
    eventNoteCount > 0
      ? `${eventNoteCount} ${eventNoteCount === 1 ? "note" : "notes"}`
      : null,
  ]
    .filter(Boolean)
    .join(" · ")

  return (
    <>
      <SectionHead
        title="Timeline"
        count={countLabel}
        actions={
          <>
            <label className="inline-flex cursor-pointer items-center gap-1.5 px-1 text-[12.5px] text-muted-foreground has-[:checked]:text-foreground">
              <Switch
                size="sm"
                checked={notesOnEvents}
                onCheckedChange={setNotesOnEvents}
                aria-label="Notes on events"
              />
              Notes on events
            </label>
            <TimelineFilter
              types={allTypes}
              activeTypes={activeTypes}
              countByType={countByType}
              onToggleType={toggleType}
              hideSensitive={hideSensitive}
              onToggleSensitive={setHideSensitive}
              onReset={reset}
            />
            <Button
              variant="tertiary"
              size="sm"
              aria-pressed={hideSensitive}
              onClick={() => setHideSensitive((value) => !value)}
              title="Hide events flagged as sensitive"
              className={cn(
                hideSensitive && "bg-coral-500/10 text-coral-700"
              )}
            >
              {hideSensitive ? (
                <EyeIcon className="text-coral-600" />
              ) : (
                <EyeOffIcon />
              )}
              {hideSensitive ? "Show sensitive" : "Hide sensitive"}
            </Button>
          </>
        }
      />
      {visibleEvents.length > 0 ? (
        <TimelineSection
          events={visibleEvents}
          notesOnEvents={notesOnEvents}
          eventNotes={eventNotes}
          clientId={clientId}
          canManageNotes={canManageNotes}
          currentUserName={currentUserName}
          onTurnOnNotes={() => setNotesOnEvents(true)}
        />
      ) : (
        <div className="flex items-center gap-2 py-5 pl-8 text-[13px] text-muted-foreground">
          <FilterXIcon className="size-3.5" />
          No events match the current filter.
          <button
            type="button"
            onClick={reset}
            className="bg-transparent p-0 text-cobalt-500 hover:underline"
          >
            Reset filter
          </button>
        </div>
      )}
    </>
  )
}
