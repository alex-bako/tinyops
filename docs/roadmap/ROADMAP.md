# Roadmap

Three active threads. Each has its own feature PRD; the domain vocabulary is shared ([domain](../domain/DOMAIN.md)).

## Workspace invites

Direction: make inviting a real person into an existing workspace work end to end, reusing the invitation storage and RPCs that already exist. Source documents: [feature PRD](../product/workspace-invites.md), [domain vocabulary](../domain/DOMAIN.md).

| ID | Milestone | User outcome | Status | Depends on | Requirements |
|----|-----------|--------------|--------|------------|--------------|
| M1 | [Invite a person into a workspace](milestones/M1.md) | An owner invites an assistant by email; the assistant receives a link, signs in, gives their name and lands in the owner's workspace with the right role. A copyable link covers email failures. | delivered locally (branch `feat/workspace-invites`) | none | INV-2 … INV-9 |
| M2 | [Invitee lands in Join, not Onboarding](milestones/M2.md) | A brand-new invitee who follows the invite link sees the Join screen and ends up only in the workspace she was invited to; later she can create her own workspace from the switcher without repeating onboarding. | planned | M1 | INV-3, INV-12, INV-13 |

Slice order inside M1 (see the milestone document for gates and details):

1. `M1.T1` Join flow for invitees — first slice, small and independently useful.
2. `M1.T2` Invite email on create and Resend.
3. `M1.T3` Copy invite link on pending rows.
4. `M1.S1` Hosted email delivery spike/ops — required before M1 can be accepted on staging; no code dependency.

Dependencies are acyclic: T2 → T1, T3 → T1, S1 → none; M1 exit needs all four.

Slice order inside M2:

1. `M2.T1` Workspace list means memberships only — fixes the routing defect C1 and re-verifies INV-3.

M2 depends on M1 (it corrects M1.T1's policy side effect). INV-13 is accepted by a manual check in the M2 exit gate; no code slice is planned for it because the switcher entry, form and RPC already exist (D2).

## Onboarding input reliability

Direction: make the first two minutes in the product work — derived fields that keep up with typing, and validation that reaches the person at the field instead of as one sentence on the last screen. Source documents: [feature PRD](../product/onboarding-input-reliability.md), [domain vocabulary](../domain/DOMAIN.md).

| ID | Milestone | User outcome | Status | Depends on | Requirements |
|----|-----------|--------------|--------|------------|--------------|
| M3 | [Onboarding fields that keep up and speak up](milestones/M3.md) | A founder types a name and sees it filled in correctly, learns at the field that a handle is too short or already taken, and never meets an unexplained failure on the final screen. An invited member gets the same behavior when she creates her own workspace. | planned | none (M2's D2 path is the reason M3.T5 exists) | OBI-1 … OBI-12; OBI-11 and OBI-13 preserved as invariants |

Slice order inside M3 (see the milestone document for gates and details):

1. `M3.T1` Derived fields track their source — first slice; fixes the reported defect on its own.
2. `M3.T2` One normalization rule and handle field errors.
3. `M3.T3` Live availability check and suggestion.
4. `M3.T4` Server validation failures reach their field.
5. `M3.T5` Create-workspace form shares the same behavior.

Dependencies are acyclic: T1 → none; T2 → none; T3 → T2; T4 → T2; T5 → T2, T3, T4. M3 exit needs all five.

## Home is the client list

Direction: make the first screen after signing in show the workspace's real clients instead of hardcoded example data, and leave nothing in the signed-in shell that only pretends to work. Source documents: [feature PRD](../product/home-clients-list.md), [domain vocabulary](../domain/DOMAIN.md).

| ID | Milestone | User outcome | Status | Depends on | Requirements |
|----|-----------|--------------|--------|------------|--------------|
| M4 | [Home is the client list](milestones/M4.md) | Signing in puts the workspace's real clients on screen, with one search bar above them that narrows them as you type. Every sidebar row goes somewhere real. No fabricated greeting, counts, tasks or dead nav entries remain. | planned | none | HOME-1 … HOME-12; HOME-13 … HOME-15 preserved as invariants |

Slice order inside M4 (see the milestone document for gates and details):

1. `M4.T1` Home renders the client list — first slice; makes the home screen useful on its own.
2. `M4.T2` Every sidebar row leads somewhere.
3. `M4.T3` One search bar, and it drives the list.

Dependencies are acyclic: T1 → none; T2 → T1; T3 → T1. M4 exit needs all three.

M4 is independent of the invites thread above, and of the onboarding-input-reliability thread (M3) planned in parallel. It shares only the fact that onboarding and the Join flow both land a person on `/home` — behavior M4 improves rather than moves.

