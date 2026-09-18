# Roadmap — workspace invites

Direction: make inviting a real person into an existing workspace work end to end, reusing the invitation storage and RPCs that already exist. Source documents: [feature PRD](../product/workspace-invites.md), [domain vocabulary](../domain/DOMAIN.md).

| ID | Milestone | User outcome | Status | Depends on | Requirements |
|----|-----------|--------------|--------|------------|--------------|
| M1 | [Invite a person into a workspace](milestones/M1.md) | An owner invites an assistant by email; the assistant receives a link, signs in, gives their name and lands in the owner's workspace with the right role. A copyable link covers email failures. | planned | none | INV-2 … INV-9 |

Slice order inside M1 (see the milestone document for gates and details):

1. `M1.T1` Join flow for invitees — first slice, small and independently useful.
2. `M1.T2` Invite email on create and Resend.
3. `M1.T3` Copy invite link on pending rows.
4. `M1.S1` Hosted email delivery spike/ops — required before M1 can be accepted on staging; no code dependency.

Dependencies are acyclic: T2 → T1, T3 → T1, S1 → none; M1 exit needs all four.
