-- Notes attached to a specific timeline event, plus authorship for notes.
--
-- A "note on an event" is a manual_note timeline_events row whose
-- parent_event_id points at the source event it annotates. Deleting the
-- parent event removes its notes (cascade). created_by records who wrote a
-- note; it defaults to the acting user so the writer never has to pass it,
-- and is set null (not cascaded) if the author's profile is removed.

alter table public.timeline_events
  add column parent_event_id uuid
    references public.timeline_events(id) on delete cascade,
  add column created_by uuid
    references public.profiles(id) on delete set null
    default auth.uid();

-- Fast "notes for event X" lookups; only note rows carry a parent.
create index timeline_events_parent_event_idx
  on public.timeline_events (parent_event_id)
  where parent_event_id is not null;
