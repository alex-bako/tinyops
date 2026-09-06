-- Timeline bodies gain a `tags` block: a labelled set of short values the UI
-- renders as chips. MailerLite group membership is the first user.

create or replace function public.is_valid_timeline_event_body(
  value jsonb
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when jsonb_typeof(value) = 'object'
      and jsonb_typeof(value->'text') = 'string'
      and jsonb_typeof(value->'blocks') = 'array'
    then not exists (
      select 1
      from jsonb_array_elements(value->'blocks') as block(item)
      where not coalesce(
        (
          block.item->>'kind' = 'text'
          and jsonb_typeof(block.item->'text') = 'string'
          and btrim(block.item->>'text') <> ''
        )
        or (
          block.item->>'kind' = 'qa'
          and jsonb_typeof(block.item->'question') = 'string'
          and btrim(block.item->>'question') <> ''
          and jsonb_typeof(block.item->'answer') = 'string'
          and btrim(block.item->>'answer') <> ''
        )
        or (
          block.item->>'kind' = 'tags'
          and jsonb_typeof(block.item->'label') = 'string'
          and btrim(block.item->>'label') <> ''
          and jsonb_typeof(block.item->'values') = 'array'
          and jsonb_array_length(block.item->'values') > 0
          and not exists (
            select 1
            from jsonb_array_elements(block.item->'values') as tag(item)
            where jsonb_typeof(tag.item) <> 'string'
              or btrim(tag.item #>> '{}') = ''
          )
        ),
        false
      )
    )
    else false
  end;
$$;
