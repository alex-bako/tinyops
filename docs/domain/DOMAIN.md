# Domain vocabulary — workspaces, invitations and workspace creation

Scope: only the terms whose meaning matters for workspace membership, invitations, and the fields a person fills in when a workspace is created. Use these words in requirements, code, tests and UI copy.

## Terms

| Term | Meaning | Not to be confused with |
|------|---------|------------------------|
| **Workspace** | The unit of client data and settings owned by a business. Every member belongs to it with one role. | A user's account. One user can be in several workspaces. |
| **Workspace name** | The workspace's display text, shown in the switcher and headers. Free-form: no minimum length, no uniqueness. Two unrelated workspaces may both be called "Park Therapy". | The handle. The name is never part of a URL and never collides. |
| **Handle** | The workspace's address segment (`tinyops.app/<handle>`). Globally unique across all workspaces, 3–63 characters, lowercase letters, digits and inner dashes. Stored in `workspaces.handle`. | The workspace name, and the workspace id. The handle is the only user-chosen value that can be **taken**. |
| **Normalization** | The single rule that turns typed text into a candidate handle: lowercase, trim, collapse every run of other characters into one dash, drop leading and trailing dashes, cap at 63. One implementation, shared by both creation screens and the server. | Rejecting input. Normalization never discards a character silently; it transforms the whole value. |
| **Taken** | A candidate handle that an existing workspace already owns. Determined only by the database's unique constraint; an availability answer is a report about it, not the decision. | Invalid, which is about the handle's own shape and is decided without the database. |
| **Availability check** | A `security definer` RPC answering, for one normalized handle, whether it is free. Authenticated callers only, boolean only. Advisory: it describes the moment it was asked. | A reservation. Nothing is held; a handle can be taken between the answer and the insert. |
| **Derived field** | A field the flow fills from another field — sender name from first and last name, handle and icon letter from the workspace name. It tracks its source on every keystroke **until the person edits it**, then it is theirs. Clearing it re-arms derivation. | A default, which is written once and then ignores its source. The defect fixed here was a default pretending to be a derived field. |
| **Field error** | A validation failure attached to the field that caused it, on the step that holds it. Every server-side validation failure maps to one. | A flow error, shown once at the end with no field and no way back. |
| **Member** | A user with a `workspace_memberships` row for the workspace. | An invitee, who has no membership yet. |
| **Role** | One of owner, admin, operator, reviewer, viewer. Exactly one owner per workspace, created with it. | Supabase database roles. |
| **Inviter** | The owner or admin who creates an invitation. Recorded as `invited_by`. | |
| **Invitation** | A `workspace_invitations` row: workspace, email, role, inviter. It is **pending** until `accepted_at` or `revoked_at` is set. | The login allowlist entry (below). |
| **Invitee** | The person the invitation's email addresses. May or may not already have a TinyOps account. | |
| **Seat** | One unit of the workspace's `plan_seats`. Seats used = members + pending invitations. | |
| **Login allowlist** | The `auth_invites` table. An email must be present there to request a magic link or be created by Supabase Auth. Creating an invitation adds the email; it is never removed by this feature. | A workspace invitation. The allowlist says "may sign in"; the invitation says "may join this workspace". |
| **Invite email** | The email Supabase Auth sends when an invitation is created or resent. Contains a sign-in link. | The Members page's in-app pending row. |
| **Invite link** | A one-time Supabase sign-in link for the invitee's address, either inside the invite email or copied from the Members page. Signs in that address only, then lands on the Join flow. | A public "anyone with the link" URL. It is address-bound and expires. |
| **Join flow** | The screen an invitee lands on after signing in: shows pending invitations, asks for a name, and accepts one. | Onboarding, which creates a new workspace. |
| **Onboarding** | The existing founder setup flow that creates a personal workspace. | The Join flow. |

## Invariants

- One pending invitation per (workspace, email). Enforced by a partial unique index and the create RPC.
- An invitation can only be accepted by a signed-in user whose email equals the invitation email. Enforced by the accept RPC and RLS.
- Owner cannot be invited; invitation roles are admin, operator, reviewer, viewer.
- Creating an invitation never exceeds seats: members + pending < `plan_seats`.
- Revoked or accepted invitations are inert: they cannot be accepted again, and an invite link for them leads to a neutral "no longer valid" message.
- A user with pending invitations and no membership is routed to the Join flow, never forced through Onboarding. A user with at least one membership is never blocked by pending invitations.
- "My workspaces" means memberships only. An invitee may read the name and icon of the workspace they are invited to, but that visibility is not a membership and must never route them as a member.
- A member can own a workspace and belong to others at the same time; creating a workspace never requires Onboarding for an already onboarded profile.
- Accepting marks the profile onboarded with the supplied name; no workspace is created.
- Sending an email is best-effort: email failure never prevents the invitation from being saved.
- A handle is globally unique, 3–63 characters, and matches `^[a-z0-9][a-z0-9-]{1,62}[a-z0-9]$`. Enforced by the `workspaces` unique index and the `workspaces_handle_normalized` check constraint.
- The handle a person is shown before submitting is the handle that gets stored. Normalization is one shared rule; a screen that computes a handle differently from the server is a defect.
- A workspace name is never unique and never has a length rule. Only the handle can be taken.
- A derived field follows its source until the person edits it, and never after. Being non-empty is not evidence that a person edited it.
- Availability is advisory; the insert is the authority. A collision at insert is reported as a field error on the handle, not as a failed flow.
- Every validation failure reaches the person as a field error on the step holding that field. No validation failure is reported for the first time on the final step.

## Examples

- Ada (owner) invites `va@example.com` as operator → pending invitation, `va@example.com` in allowlist, invite email sent, seats used 2 of 5.
- VA clicks the link → signed in → Join flow shows "Ada's Studio · Operator" → enters name → Accept → active workspace is Ada's Studio, role operator, invitation accepted, seats used 2 of 5.
- Ada revokes before VA clicks → VA's link signs them in, Join flow shows "This invite is no longer valid" and a way to sign out; nothing is created.
- Ben already uses TinyOps for his own workspace and is invited by Ada → he gets a magic-link email; after sign-in he is not sent to Join (he has a membership) but sees Ada's Studio under Invitations in the switcher and can accept there. He stays one Auth user with two memberships; no second account or profile is created.
- Mia joined Ada's Studio as operator and six months later starts her own practice → switcher "Create or join a workspace" → name + handle → she now owns "Mia's Studio" and still switches back to Ada's Studio; no second account, no onboarding questions.
- Alex types `Alex` then `Bakó`; the sender name reads `Alex Bakó` throughout. He replaces it with `Alex at Bako Studio`; typing in Last name afterwards no longer changes it.
- Ada types `Park Therapy`; the handle reads `park-therapy` and the icon letter `P`. She edits the handle to `park-clinic`; continuing to type in the name no longer changes it.
- Mia types `Pa` in the workspace name. The handle `pa` is two characters: the handle field says a handle needs at least 3 characters, and Continue is unavailable. Nothing is reported on the name field, which is free-form.
- Ben types `Park Therapy` but `park-therapy` already belongs to Ada's workspace. The handle field says it is taken and offers `park-therapy-2`; Ben accepts it in one click and continues.
- Two people submit `park-clinic` in the same second. Both were told it was available; the second insert violates the unique constraint, and that person is returned to the Workspace step with "just taken" on the handle field and every other answer intact.
- The availability RPC is unreachable. The handle field says availability could not be checked, Continue stays available, and a real collision is still caught at submit.
- Mia types `Park` into the handle field directly. It becomes `park`, not `ark`: normalization lowercases the `P` instead of discarding it.
- Cara has an Auth account (allowlisted earlier) but never finished onboarding and has no membership; Ada invites her → after sign-in she gets the Join flow, not onboarding, and joins Ada's Studio as the same user (INV-11).

## Boundaries

- **Auth (Supabase Auth, `auth_invites`, the before-user-created hook)** decides who may sign in. Owned by `apps/web/lib/auth` and the Auth migrations.
- **Workspace membership (`workspaces`, `workspace_memberships`, `workspace_invitations`, lifecycle RPCs)** decides who is in which workspace with which role. Owned by `apps/web/features/workspaces`.
- **Onboarding (`complete_onboarding`)** creates a founder's workspace and marks the profile onboarded. The Join flow reuses "mark onboarded" but not workspace creation.
- **Handle normalization and availability** is one shared module under `apps/web/features/workspaces`, used by the onboarding flow, the create-workspace form and the server actions, plus one `security definer` RPC for the availability answer. No screen carries its own copy of the rule.
- **Email delivery (hosted Supabase SMTP and templates)** is configuration outside the repo; the code treats send failures as a reportable, non-fatal outcome.
