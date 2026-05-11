create or replace function public.read_imap_thread_message_ids(
  target_workspace_id uuid,
  target_source_id uuid
)
returns text[]
language sql
stable
security definer
set search_path = ''
as $$
  with source_records as (
    select record.raw_payload
    from public.raw_source_records record
    where record.workspace_id = target_workspace_id
      and record.source_id = target_source_id
      and record.record_type = 'email'
      and record.processing_status = 'processed'
  ),
  raw_ids as (
    select jsonb_array_elements_text(
      case
        when jsonb_typeof(
          raw_payload -> 'metadata' -> 'imapThread' -> 'relatedMessageIds'
        ) = 'array'
          then raw_payload -> 'metadata' -> 'imapThread' -> 'relatedMessageIds'
        else '[]'::jsonb
      end
    ) as message_id
    from source_records

    union all

    select raw_payload -> 'metadata' -> 'imapThread' ->> 'messageId' as message_id
    from source_records

    union all

    select raw_payload -> 'metadata' ->> 'messageId' as message_id
    from source_records
  ),
  normalized as (
    select lower(regexp_replace(btrim(coalesce(message_id, '')), '\s+', '', 'g')) as message_id
    from raw_ids
  )
  select coalesce(
    array_agg(distinct message_id order by message_id)
      filter (where message_id <> ''),
    array[]::text[]
  )
  from normalized
$$;

grant execute on function public.read_imap_thread_message_ids(uuid, uuid)
  to service_role;
revoke execute on function public.read_imap_thread_message_ids(uuid, uuid)
  from anon, authenticated, public;
