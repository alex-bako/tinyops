# Onboarding input reliability — feature PRD

Status: draft for acceptance · Planning run: `onboarding-input-reliability` · Parent PRD: [../PRD.md](../PRD.md) · Related: [workspace invites](workspace-invites.md) (decision D2)

## Problem

The onboarding flow's derived fields are broken and its validation is invisible. Typing `Alex` / `Bakó` leaves "How clients know you" reading `A`; typing `Park Therapy` leaves the URL handle reading `p`. A handle that is too short, or one that another workspace already owns, is accepted by every step and then fails five screens later as a single unexplained sentence on the final screen, with no way back to the field that caused it. A founder's first two minutes in the product consist of fields that fight them and an error that tells them nothing.

## Users

- **Founder in onboarding** (persona 5.1, owner): signing up for the first time, filling name and workspace fields. Wants the obvious defaults filled in, and wants to be told about a problem at the field, while they are looking at it.
- **Invited member starting her own workspace** (persona 5.2, the D2 path in [workspace invites](workspace-invites.md)): reaches the same workspace name + handle decision through the switcher's "Create workspace" form, which has the same defects.

## Success

- Typing a first and last name fills the sender name with the full name, and it keeps up with every keystroke until the person edits it themselves; after that it is theirs and is never overwritten.
- Typing a workspace name fills the handle and icon letter the same way.
- A handle that is too short, malformed, or already taken is reported under the field on the Workspace step, before Continue is available — never for the first time on the final screen.
- A person who reaches the final screen and still gets a server-side failure is told which field is wrong and is returned to it.
- Reproduced by a test that types character by character, because the defect is invisible to a test that sets a field's whole value in one event.

## Primary flow

1. Step "Your name": person types `Alex` in First name, `Bakó` in Last name. "How clients know you" reads `Alex Bakó` throughout.
2. They may overwrite it with `Alex at Bako Studio`. From that point neither name field changes it.
3. Step "Workspace": they type `Park Therapy`. The handle field tracks it to `park-therapy` and the icon preview to `P`, until they edit either one.
4. As they type, the handle is checked for availability. `park-therapy` is free: the field shows it is available. If it were taken, the field says so and offers a free alternative they can accept in one click.
5. Continue is available only when the handle is 3–63 characters, correctly formed, and known to be free. Each failing condition names itself under the field.
6. They finish onboarding. The workspace is created with exactly the handle the field showed them.

## Failure and recovery scenarios

- Handle taken between the check and submit (two people, same second): the server rejects it, the flow returns to the Workspace step with the handle field marked "just taken", and no other answer is lost.
- Availability check fails (offline, RPC error): the field says availability could not be checked, Continue stays available, and a genuine collision is caught at submit and returned to the field.
- The person types faster than the check answers: only the answer for the handle currently in the field is ever shown.

## Requirements

Stable IDs. "Existing" means already implemented and covered by tests.

| ID | Requirement | Status |
|----|-------------|--------|
| OBI-1 | A derived field (sender name, handle, icon letter) tracks its source field on every keystroke until the person edits the derived field themselves; after that it is never overwritten for the rest of the flow. Clearing the derived field re-arms derivation. | New (defect) |
| OBI-2 | One handle normalization rule is shared by the onboarding UI, the create-workspace UI and the server, so the handle a person is shown is the handle that is stored. It produces only values the `workspaces_handle_normalized` constraint accepts, or nothing. | New (defect: two divergent `slugify` implementations) |
| OBI-3 | The handle field accepts what a person actually types, including uppercase and spaces, by normalizing it, rather than silently discarding characters (typing `Park` currently yields `ark`). | New (defect) |
| OBI-4 | A handle shorter than 3 characters, longer than 63, or malformed is reported under the handle field on the Workspace step, and Continue is unavailable while it fails. The message names the rule. | New |
| OBI-5 | Handle availability is checked live as the person types, debounced, and the result is shown under the field as available or taken. Only the response matching the handle currently in the field is displayed. | New (D3) |
| OBI-6 | When a handle is taken, the field offers a concrete free alternative derived from it, which the person can accept in one action. | New |
| OBI-7 | Availability is answered by a `security definer` RPC that returns a boolean for one normalized handle to authenticated callers only. It returns no other workspace data. | New |
| OBI-8 | Every onboarding validation failure returned by the server names its field, and the flow returns the person to the step holding that field with the message attached to it, instead of showing one generic sentence on the final screen. | New |
| OBI-9 | An availability check that errors or times out never blocks onboarding; submit remains the authority on collisions. | New |
| OBI-10 | The switcher's create-workspace form derives its handle, validates length and format, checks availability live, and reports a taken handle at the field — the same behavior as onboarding, from the same shared code. | New (D4) |
| OBI-11 | Workspace names stay free-form: no minimum length, no uniqueness. Two unrelated workspaces may share a display name. | Existing (D2 confirms) |
| OBI-12 | Component tests drive these fields one character at a time, so a derivation that only fires on the first keystroke fails the suite. | New (test gap) |
| OBI-13 | The IMAP, invite and sensitivity steps keep their current behavior; this feature does not change what onboarding collects or creates. | Existing |

## Scope

In scope: OBI-1 through OBI-12, across the onboarding flow and the switcher's create-workspace form.

Non-goals (explicit):

- Any change to what onboarding asks for, its step order, or the workspace it creates.
- Workspace name uniqueness or a name length rule, and any migration to enforce them (rejected in D2).
- Server-side silent handle deduplication (`-2`, `-3`) that changes the URL without telling the person (rejected in D2).
- Changing the handle format itself, the `workspaces_handle_normalized` constraint, or the 63-character ceiling.
- Reserved-word or profanity blocklists for handles.
- Editing an existing workspace's handle in Settings, beyond what OBI-2's shared rule changes incidentally.
- Rate limiting or abuse protection on the availability RPC beyond requiring an authenticated caller (see D3's accepted tradeoff).

## Constraints and sourced facts

Verified in the code on 2026-09-18:

- The derivation defect is the guard `if (data.firstName && !data.senderName)` at [`onboarding-flow.tsx:74`](../../apps/web/components/onboarding/onboarding-flow.tsx) and the matching `!data.handle` / `!data.iconLetter` guards at line 81. The effect runs on the first keystroke, fills the field, and its own guard then blocks every later run. It is "derive while empty", not "derive until edited".
- `onboarding-flow.test.tsx` passes today because it fires one `change` event carrying the complete value. `@testing-library/user-event` is not a dependency; character-by-character typing must be driven by repeated `change` events or by adding that package.
- `canContinue` for the workspace step requires `handle.trim().length > 0`; `normalizeCommand` in `features/onboarding/application.ts` requires `slugify(handle).length >= 3` and returns `workspace_handle_required`. The gap is what lets a 2-character handle through the step.
- `workspaces.handle` is `not null unique` with `check (handle = lower(btrim(handle)) and handle ~ '^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$')` — global uniqueness, 3–63 characters. Source: `supabase/migrations/20260509001000_workspaces.sql`.
- `complete_onboarding` and `create_personal_workspace` both insert the handle with no duplicate check, so a taken handle surfaces as a Postgres unique violation. `createSupabaseOnboardingStore` rethrows it and `application.complete` maps every store failure to `onboarding_failed`, which the UI renders as "Onboarding could not be completed. Check the fields and try again." on the Done step.
- Two different `slugify` implementations exist: `components/onboarding/data.tsx` keeps existing dashes and truncates at 32 characters; `features/workspaces/use-cases.ts` collapses every non-alphanumeric run, applies no length cap, and falls back to `"workspace"`. The server uses the second, so the handle shown during onboarding is not always the handle stored.
- Neither implementation enforces the 63-character ceiling, and the handle input has no maxlength, so a long name reaches the database constraint and fails as `onboarding_failed`.
- RLS on `workspaces` allows a select only to members ("Members can read visible workspaces") and to pending invitees (`20260918000100_invitee_reads_invited_workspace.sql`). A signed-in stranger therefore cannot answer "does this handle exist" with a plain select; a `security definer` RPC is required (OBI-7).
- The switcher's create-workspace form (`app/(app)/home/workspaces/new/_components/create-workspace-form.tsx`) does not derive a handle at all, does not normalize the field, and renders every failure as "Could not create workspace." `mapWorkspaceActionError` collapses unrecognized errors to `workspace_action_failed`.
- Tests are Vitest + Testing Library with jsdom (`apps/web/vitest.config.ts`). There is no end-to-end browser test framework in the repo; SQL behavior is covered by psql contract scripts under `supabase/tests/` run through `pnpm supabase:test:*`.

## User decisions

- **D1 (2026-09-18)**: A derived field follows its source until the person edits it, then stops. Rejected: filling it once and freezing, which is the current defect.
- **D2 (2026-09-18)**: The length rule and the uniqueness check belong to the **handle**. The workspace name stays free-form display text with no minimum length and no uniqueness, and needs no migration. Rejected: making names unique, and moving uniqueness onto the name while deduplicating the handle silently server-side.
- **D3 (2026-09-18)**: Handle availability is checked **live as the person types**, not on Continue and not only at submit. Accepted tradeoff, stated at the time of the decision: any authenticated user can then probe whether a given handle exists. Accepted consequences: debounce, stale-response discarding and an offline path must be implemented and tested.
- **D4 (2026-09-18)**: The switcher's create-workspace form is in scope and gets the same behavior from the same shared code, because it is the path an invited member uses to start her own workspace (D2 of the invites PRD).

## Proposed assumptions (not yet user-confirmed; treated as accepted unless objected to)

- **A1** The icon letter follows the same "derive until edited" rule as the handle, since it is derived from the same source field and is broken in the same way.
- **A2** The suggestion offered for a taken handle is the handle with the smallest numeric suffix that is free (`park-therapy-2`), and it is itself checked before being offered.
- **A3** "Available" is advisory, never a guarantee. Submit stays the only authority, and the submit-time collision path (OBI-8) is what makes the race safe.
- **A4** The availability RPC is granted to `authenticated` only, never `anon`, consistent with the existing revoke-by-default grant policy in `20260625…_revoke_default_grants`.
- **A5** Character-by-character typing in tests is driven by repeated `change` events rather than adding `@testing-library/user-event`, keeping the dependency list unchanged. If a case genuinely needs real key events, adding the package is a decision to raise then, not now.
- **A6** Existing workspaces are untouched. OBI-2's shared rule applies to handles being created or edited from now on; no backfill runs.

## Open decisions

None blocking. Deferred to implementation: the exact wording of the field messages, and the debounce interval (a starting value is proposed in the milestone, to be confirmed against the local stack).
