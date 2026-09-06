-- Connectors that import a person without any activity used to file that under
-- `system_event`, which the UI renders as a CSV import. Nothing about it is a
-- system event or a CSV: a person was added to Stripe or MailerLite.

alter table public.timeline_events
  drop constraint if exists timeline_events_event_type_valid;

alter table public.timeline_events
  add constraint timeline_events_event_type_valid check (
    event_type in (
      'email_received',
      'email_sent',
      'form_submission',
      'csv_import_row',
      'manual_note',
      'tinyops_email',
      'system_event',
      'payment',
      'email_engagement',
      'refund',
      'dispute',
      'invoice',
      'subscription',
      'contact_added'
    )
  );

-- Re-type what the two connectors already wrote, so the next sync updates
-- these rows in place instead of inserting a second copy under the new type.
update public.timeline_events event
set event_type = 'contact_added'
from public.raw_source_records raw
where raw.id = event.raw_record_id
  and event.event_type = 'system_event'
  and raw.record_type in ('stripe_customer', 'mailerlite_subscriber');
