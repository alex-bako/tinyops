-- Backfill: repair client slugs that were generated before
-- public.slugify_client_name() transliterated accented names. Recomputes the
-- slug (base from display_name, falling back to the email local-part, then
-- 'client') with the same `-md5(primary_email)[:8]` suffix the RPC uses, and
-- only rewrites rows whose stored slug actually differs.
--
-- No-op on a fresh `db reset` (the clients table is empty); repairs existing
-- data otherwise.

update public.clients c
set slug = concat(
  left(coalesce(
    nullif(public.slugify_client_name(c.display_name), ''),
    nullif(public.slugify_client_name(split_part(c.primary_email, '@', 1)), ''),
    'client'), 56),
  '-', left(md5(c.primary_email), 8))
where c.slug is distinct from concat(
  left(coalesce(
    nullif(public.slugify_client_name(c.display_name), ''),
    nullif(public.slugify_client_name(split_part(c.primary_email, '@', 1)), ''),
    'client'), 56),
  '-', left(md5(c.primary_email), 8));
