-- Initial local seed file.
insert into public.auth_invites (email)
values ('anna@example.co')
on conflict (email) do nothing;
