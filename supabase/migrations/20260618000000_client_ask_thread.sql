-- Persisted "Ask AI" conversation thread, one shared thread per client.
--
-- Each row is one Q&A turn: the question text plus the synthesized, citation-
-- backed answer (the full GroundedAnswerData) stored as jsonb. Turns are shared
-- across the workspace (any member sees the thread) and attributed to the asker
-- via created_by. The thread is the running conversation about a client; the
-- route reads it to ground context-aware follow-ups and appends each completed
-- turn, and the detail page hydrates it on load.
--
-- Access model (mirrors public.timeline_events):
--   * any member may READ the thread (shared knowledge),
--   * any member may ADD their own turn (created_by must be the actor),
--   * only owners/admins may CLEAR the thread (a shared, destructive delete).
--
-- Grants live in this migration (not 20260604000000_authenticated_table_grants)
-- because that migration has already shipped; the rls_grant_invariants_contract
-- test asserts the final state — every RLS policy has a backing grant — not the
-- file it lives in.

create table public.client_ask_turns (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  question text not null,
  answer jsonb not null,
  created_by uuid references public.profiles(id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  constraint client_ask_turns_question_present check (btrim(question) <> ''),
  constraint client_ask_turns_answer_is_object check (jsonb_typeof(answer) = 'object')
);

alter table public.client_ask_turns enable row level security;

-- Thread read/append order is always (workspace, client) by time.
create index client_ask_turns_client_created_idx
  on public.client_ask_turns (workspace_id, client_id, created_at);

create policy "Members can read ask turns"
  on public.client_ask_turns
  for select
  to authenticated
  using (public.workspace_actor_role(workspace_id) is not null);

create policy "Members can add their own ask turns"
  on public.client_ask_turns
  for insert
  to authenticated
  with check (
    public.workspace_actor_role(workspace_id) is not null
    and created_by = (select auth.uid())
  );

create policy "Owners and admins can clear ask turns"
  on public.client_ask_turns
  for delete
  to authenticated
  using (public.workspace_actor_role(workspace_id) in ('owner', 'admin'));

-- Backing grants for the policies above (least privilege; no update path).
grant select, insert, delete on public.client_ask_turns to authenticated;
