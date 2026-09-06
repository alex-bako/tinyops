-- Stripe activity used to collapse into a single `payment` event, so a refund,
-- a dispute and a subscription renewal were indistinguishable in the timeline
-- filter. Each object kind now gets its own event type.

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
      'subscription'
    )
  );

-- Re-type events already ingested as `payment`. The raw record type is the
-- authority; re-syncing would fix these anyway, but not until the next pass.
update public.timeline_events event
set event_type = case raw.record_type
    when 'stripe_refund' then 'refund'
    when 'stripe_dispute' then 'dispute'
    when 'stripe_invoice' then 'invoice'
    when 'stripe_subscription' then 'subscription'
  end
from public.raw_source_records raw
where raw.id = event.raw_record_id
  and event.event_type = 'payment'
  and raw.record_type in (
    'stripe_refund',
    'stripe_dispute',
    'stripe_invoice',
    'stripe_subscription'
  );
