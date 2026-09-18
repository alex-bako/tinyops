# Workspace invites — feature PRD

Status: draft for acceptance · Planning run: `workspace-invites` · Parent PRD: [../PRD.md](../PRD.md) (persona 5.2 Assistant / Operations Helper)

## Problem

A workspace owner (today: a solo founder already using TinyOps) wants a real person, her virtual assistant, to work inside her existing workspace. The Members page can already record an invitation, but the invited person is never told about it, and when they do sign in they are forced to create a workspace of their own before the invitation becomes visible. In practice inviting a person does not work.

## Users

- **Inviter**: workspace owner or admin (persona 5.1). Wants to type an email, pick a role, and have the person show up.
- **Invitee**: the assistant (persona 5.2). Usually has no TinyOps account. Wants one link that puts them in the right workspace with the right role, no setup questions about "their" business.

## Success

- The inviter sends an invite from Settings → Members and the invitee, who is not a member of the Supabase organisation, receives an email with a working link.
- The invitee signs in through that link, enters their name, and lands in the inviter's workspace with the invited role, without creating a workspace.
- If email delivery fails, the inviter can still get the person in by copying a link.
- Verified end to end on staging with a non-organisation email address before being called done.

## Primary flow

1. Owner enters `va@example.com`, role Operator, clicks Send invite.
2. Invitation is recorded (existing RPC), the address is allowlisted for login (existing), and an invite email is sent to the address.
3. Invitee clicks the link, is signed in, and sees a Join screen: workspace name, role, first/last name field, Accept button.
4. On Accept the membership is created (existing RPC), the profile is marked onboarded, and the invitee is redirected into the workspace.
5. The owner's Members list shows the new member; the pending invite disappears.

## Requirements

Stable IDs. "Existing" means the behaviour is already implemented and covered by tests; it is listed so acceptance covers the whole flow.

| ID | Requirement | Status |
|----|-------------|--------|
| INV-1 | Owner/admin creates an invitation with email + non-owner role; seat limit, duplicate and role rules are enforced server-side. | Existing |
| INV-2 | Creating an invitation sends the invitee an email containing a sign-in link that lands on the Join flow. "Resend" on a pending invite sends it again. | New |
| INV-3 | A signed-in user who has at least one pending invitation and no workspace membership is taken to the Join flow, not to workspace creation. The Join flow captures first name (required) and optional last name, then accepts the chosen invitation. | New |
| INV-4 | After accepting, the invitee lands in the invited workspace as active workspace, with the invited role, and the profile counts as onboarded. | New |
| INV-5 | Each pending invite row offers a copyable sign-in link for that address. The link can be regenerated; a regenerated link invalidates nothing else. The link signs in only the invited address. | New |
| INV-6 | If sending the email fails, the invitation is still saved and the inviter sees "Invite saved, email not sent" with the copy-link available. | New |
| INV-7 | An existing TinyOps user invited to another workspace receives the same email; after sign-in they can accept from the Join flow or the workspace switcher (switcher path is existing). | New (email) / Existing (switcher) |
| INV-11 | One person is one Auth user regardless of how many workspaces they belong to. Inviting an address that already has an account never creates a second account; accepting adds a membership to the existing user, who then switches between workspaces with the switcher. Applies whether the invitee was onboarded through their own workspace or only has an account with no membership. | New (Join path) / Existing (switcher, membership model) |
| INV-8 | A revoked or already-accepted invitation cannot be accepted, and the link for it no longer leads anywhere useful (it shows a neutral "invite no longer valid" message). | Existing (RPC) / New (message) |
| INV-9 | The hosted Supabase projects have custom SMTP, invite/magic-link templates and redirect allowlist configured so that email reaches non-organisation addresses. | New (ops, outside repo) |
| INV-10 | Uninvited addresses keep getting the neutral invite-only message on login; nothing about this feature reveals whether an address is known. | Existing |
| INV-12 | The app's list of "my workspaces" contains only workspaces the user is a member of. Being able to read an invited workspace's name for the Join screen never counts as membership, so an invitee with no membership is never routed as if they had one. | New (defect found 2026-09-18) |
| INV-13 | A member who joined by invitation can later create her own workspace from the switcher's "Create or join a workspace" entry. She keeps one account; the new workspace is added next to the one she was invited to and she is not sent through founder onboarding again. | Existing (form, RPC) / New (acceptance) |

## Scope

In scope: INV-2 through INV-9 above, for both new and existing TinyOps users, on the Members page and the switcher.

Non-goals (explicit):

- Changes to the role/permission model or what each role can see. Roles stay owner/admin/operator/reviewer/viewer as today.
- Seat billing or plan changes; the seat count stays the existing `plan_seats` value.
- Bulk invites, CSV import of members, or invite expiry policy beyond the sign-in link's own expiry.
- Password or social login. Sign-in stays magic-link based.
- Notifying members about role changes or removal.

## Constraints and sourced facts

- Invitation storage, seat/duplicate/role checks, accept and revoke already exist as security-definer RPCs (`create_workspace_invitation`, `accept_workspace_invitation`, `revoke_workspace_invitation`) with RLS and SQL contract tests. Reuse, do not duplicate.
- Login is invite-only via the `auth_invites` allowlist and the `before_user_created` Auth hook; the create-invitation RPC already inserts the allowlist row.
- The Members page and the switcher's "Invitations → Accept" already call the server actions; "Resend" is rendered disabled.
- The app layout redirects any session without `profile.onboarded_at` or an active workspace to `/onboarding`, and `complete_onboarding` always creates a workspace unless the user already has one. This is what forces invitees to create a workspace.
- No mailer library is installed. Supabase Auth is the only email channel; hosted Supabase's built-in mailer delivers only to Supabase organisation members and is rate-limited, so custom SMTP is required for real invitees.
- Staging is `main`, production deploys from `v*` tags; both use separate Supabase projects (see [../deployment.md](../deployment.md)).

## User decisions

- **D1 (2026-09-18)**: Deliver the invite both by email and by a copyable link shown on the pending invite row.
- **D2 (2026-09-18)**: An invitee who later wants her own workspace uses the existing switcher entry and create-workspace form (name + handle). She does not get the founder onboarding questions; vertical, sensitivity and sender settings stay at defaults and are editable in Settings. Rejected: re-running onboarding for a second workspace, and hiding workspace creation from invitees.

## Conflicts between accepted requirements and observed behaviour

- **C1 (2026-09-18, M1 delivered locally)**: INV-3 says an invitee with no membership goes to the Join flow, yet a fresh invitee landed on Onboarding. Verified cause: the M1.T1 policy that lets an invitee read the invited workspace (needed for the Join screen) also makes that workspace appear in the store's general workspace list, which the Join page reads as "already has a workspace"; it redirects to Home, whose layout sends the un-onboarded profile to Onboarding. Resolved by INV-12 and milestone M2.

## Proposed assumptions (not yet user-confirmed; will be treated as accepted unless objected to)

- **A1** Invitees join directly; they are not asked the founder-oriented onboarding questions (vertical, sensitivity, first source). They only provide their name.
- **A2** The copy-link is a Supabase-generated sign-in action link for the invited address (works without any mailer). It expires per the project's OTP expiry and can be regenerated. Holding the link equals holding a one-time sign-in for that address, so it is shown only to owners/admins and only for pending invites.
- **A3** New invitees are emailed with Supabase's invite email; existing users are emailed with the magic-link email. Both link to the auth callback with `next` pointing at the Join flow.
- **A4** If an invitee has several pending invitations, the Join flow lists them and accepts one at a time; the switcher keeps showing the rest.
- **A5** The user configures SMTP credentials and templates on the hosted Supabase projects themselves; the repo documents the steps but never holds the secrets.

## Open decisions

None blocking. Deferred to implementation: exact email copy. The Join flow does not offer "create my own workspace instead"; that path is the switcher entry after joining (D2).
