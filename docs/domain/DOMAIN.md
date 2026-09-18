# Domain vocabulary — workspaces and invitations

Scope: only the terms whose meaning matters for workspace membership and invitations. Use these words in requirements, code, tests and UI copy.

## Terms

| Term | Meaning | Not to be confused with |
|------|---------|------------------------|
| **Workspace** | The unit of client data and settings owned by a business. Every member belongs to it with one role. | A user's account. One user can be in several workspaces. |
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
- Accepting marks the profile onboarded with the supplied name; no workspace is created.
- Sending an email is best-effort: email failure never prevents the invitation from being saved.

## Examples

- Ada (owner) invites `va@example.com` as operator → pending invitation, `va@example.com` in allowlist, invite email sent, seats used 2 of 5.
- VA clicks the link → signed in → Join flow shows "Ada's Studio · Operator" → enters name → Accept → active workspace is Ada's Studio, role operator, invitation accepted, seats used 2 of 5.
- Ada revokes before VA clicks → VA's link signs them in, Join flow shows "This invite is no longer valid" and a way to sign out; nothing is created.
- Ben already uses TinyOps for his own workspace and is invited by Ada → he gets a magic-link email; after sign-in he is not sent to Join (he has a membership) but sees Ada's Studio under Invitations in the switcher and can accept there. He stays one Auth user with two memberships; no second account or profile is created. He stays one Auth user with two memberships; no second account or profile is created.
- Cara has an Auth account (allowlisted earlier) but never finished onboarding and has no membership; Ada invites her → after sign-in she gets the Join flow, not onboarding, and joins Ada's Studio as the same user (INV-11).

## Boundaries

- **Auth (Supabase Auth, `auth_invites`, the before-user-created hook)** decides who may sign in. Owned by `apps/web/lib/auth` and the Auth migrations.
- **Workspace membership (`workspaces`, `workspace_memberships`, `workspace_invitations`, lifecycle RPCs)** decides who is in which workspace with which role. Owned by `apps/web/features/workspaces`.
- **Onboarding (`complete_onboarding`)** creates a founder's workspace and marks the profile onboarded. The Join flow reuses "mark onboarded" but not workspace creation.
- **Email delivery (hosted Supabase SMTP and templates)** is configuration outside the repo; the code treats send failures as a reportable, non-fatal outcome.
