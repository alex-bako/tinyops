-- Google Forms live API mode: the form owner shares the form with the TinyOps
-- service account and the sync worker polls the Google Forms API on the cron
-- cadence. No rows are uploaded here; the connect RPC only records the form,
-- the identity question, and queues the first (full backfill) sync.
create or replace function public.connect_google_forms_api_data_source(
  target_workspace_id uuid,
  form_external_id text,
  form_display_name text,
  form_identity_question_id text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_role text;
  normalized_form_id text;
  normalized_display_name text;
  normalized_slug text;
  normalized_identity_question_id text;
  connected_source_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required'
      using errcode = '42501';
  end if;

  actor_role := public.workspace_actor_role(target_workspace_id);
  if actor_role not in ('owner', 'admin') then
    raise exception 'source_manage_forbidden'
      using errcode = '42501';
  end if;

  normalized_form_id := btrim(coalesce(form_external_id, ''));
  normalized_display_name := public.normalize_data_source_display_name(
    form_display_name
  );
  normalized_slug := public.require_data_source_slug(normalized_display_name);
  normalized_identity_question_id := nullif(
    btrim(coalesce(form_identity_question_id, '')),
    ''
  );

  if normalized_form_id = '' then
    raise exception 'invalid_google_form_id'
      using errcode = '22023';
  end if;

  perform public.require_unique_data_source_name(
    target_workspace_id,
    'forms',
    normalized_display_name,
    normalized_slug,
    null
  );
  perform public.require_unique_google_forms_source_config(
    target_workspace_id,
    normalized_form_id,
    'api',
    null
  );

  insert into public.data_sources (
    workspace_id,
    source_type,
    slug,
    display_name,
    status,
    config_version,
    config,
    connected_at,
    last_verified_at
  )
  values (
    target_workspace_id,
    'forms',
    normalized_slug,
    normalized_display_name,
    'connected',
    1,
    jsonb_build_object(
      'externalFormId', normalized_form_id,
      'connectionMode', 'api',
      'identityQuestionId', normalized_identity_question_id
    ),
    now(),
    now()
  )
  returning id into connected_source_id;

  insert into public.data_source_sync_states (
    source_id,
    status,
    cursor,
    last_error,
    requested_at
  )
  values (
    connected_source_id,
    'queued',
    null,
    null,
    now()
  );

  return connected_source_id;
end;
$$;

grant execute on function public.connect_google_forms_api_data_source(
  uuid,
  text,
  text,
  text
) to authenticated;

revoke execute on function public.connect_google_forms_api_data_source(
  uuid,
  text,
  text,
  text
) from anon, public;
