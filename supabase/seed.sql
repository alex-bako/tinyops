-- Initial local seed file.
insert into public.auth_invites (email)
values ('anna@example.co'),
       ('pekaryd@gmail.com'),
       ('bakoalex9595@gmail.com'),
       ('bogiassist@gmail.com')
on conflict (email) do nothing;
