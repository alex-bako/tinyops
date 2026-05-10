create or replace function public.read_imap_data_source_password(
  target_workspace_id uuid,
  target_source_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_secret_id uuid;
  decrypted_password text;
begin
  if not exists (
    select 1
    from public.data_sources source
    where source.id = target_source_id
      and source.workspace_id = target_workspace_id
      and source.source_type = 'imap'
      and source.status <> 'disconnected'
      and source.disconnected_at is null
  ) then
    raise exception 'source_not_found'
      using errcode = '42501';
  end if;

  select secret.vault_secret_id
  into active_secret_id
  from public.data_source_secrets secret
  where secret.source_id = target_source_id
    and secret.purpose = 'imap_password'
    and secret.replaced_at is null
  order by secret.created_at desc
  limit 1;

  if active_secret_id is null then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  begin
    select decrypted.decrypted_secret
    into decrypted_password
    from vault.decrypted_secrets decrypted
    where decrypted.id = active_secret_id;
  exception
    when others then
      raise exception 'secret_read_failed'
        using errcode = 'XX000';
  end;

  if decrypted_password is null then
    raise exception 'secret_read_failed'
      using errcode = 'XX000';
  end if;

  if btrim(decrypted_password) = '' then
    raise exception 'invalid_imap_config'
      using errcode = '22023';
  end if;

  return decrypted_password;
end;
$$;

grant execute on function public.read_imap_data_source_password(uuid, uuid)
  to service_role;
revoke execute on function public.read_imap_data_source_password(uuid, uuid)
  from anon, authenticated, public;
