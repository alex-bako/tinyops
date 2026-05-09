"use client"

import * as React from "react"
import { InfoIcon, MailIcon, SendIcon, UserPlusIcon, XIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import { RoleChip } from "@workspace/ui/components/role-chip"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"

import { ROLE_DEFS, ROLE_ORDER } from "@/features/workspaces/catalog"
import {
  canChangeMemberRole,
  canManageMembers,
  canRemoveMember,
} from "@/features/workspaces/policy"
import {
  buildWorkspaceInviteRows,
  buildWorkspaceMemberRows,
  type WorkspaceMemberRow,
} from "@/features/workspaces/view-models"
import type {
  Workspace,
  WorkspaceRole,
} from "@/features/workspaces/types"

export function SectionMembers({
  workspace,
  onInvite,
  onChangeRole,
  onRemoveMember,
  onRevokeInvite,
}: {
  workspace: Workspace
  onInvite: (email: string, role: WorkspaceRole) => void
  onChangeRole: (id: string, role: WorkspaceRole) => void
  onRemoveMember: (id: string) => void
  onRevokeInvite: (id: string) => void
}) {
  const canManage = canManageMembers(workspace.role)
  const seatsUsed = workspace.members.length + workspace.invites.length
  const seatsTotal = workspace.plan.seats
  const memberRows = buildWorkspaceMemberRows(workspace)
  const inviteRows = buildWorkspaceInviteRows(workspace)

  const [inviteEmail, setInviteEmail] = React.useState("")
  const [inviteRole, setInviteRole] = React.useState<WorkspaceRole>("operator")

  const submitInvite = () => {
    if (!inviteEmail.includes("@")) return
    onInvite(inviteEmail, inviteRole)
    setInviteEmail("")
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground">
          Members
        </h2>
        <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          People with access to this workspace. {seatsUsed} of {seatsTotal}{" "}
          seats used.
        </p>
      </div>

      {canManage ? (
        <div className="mb-5 grid grid-cols-[14px_1fr_160px_auto] items-center gap-2.5 rounded-md border border-dashed border-input bg-[var(--tint-hover)] px-3.5 py-3">
          <UserPlusIcon className="size-3.5 text-muted-foreground" />
          <Input
            placeholder="name@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submitInvite()
            }}
            className="bg-background"
          />
          <Select
            value={inviteRole}
            onValueChange={(v) => setInviteRole(v as WorkspaceRole)}
          >
            <SelectTrigger className="w-full bg-background">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_ORDER.filter((r) => r !== "owner").map((r) => (
                <SelectItem key={r} value={r}>
                  {ROLE_DEFS[r].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="primary" size="sm" onClick={submitInvite}>
            <SendIcon />
            Send invite
          </Button>
        </div>
      ) : null}

      <div className="flex flex-col">
        <div className="grid grid-cols-[32px_1fr_110px_90px_130px_24px] gap-3 border-b border-border px-2 py-2 text-[11px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
          <span />
          <span>Member</span>
          <span>Joined</span>
          <span>Active</span>
          <span>Role</span>
          <span />
        </div>
        {memberRows.map((m) => (
          <MemberRow
            key={m.id}
            member={m}
            actorRole={workspace.role}
            onChangeRole={onChangeRole}
            onRemove={onRemoveMember}
          />
        ))}
      </div>

      {inviteRows.length > 0 ? (
        <>
          <div className="mb-3 mt-7 text-[12px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
            Pending invites
          </div>
          <div className="flex flex-col gap-1">
            {inviteRows.map((i) => (
              <div
                key={i.email}
                className="grid grid-cols-[24px_1fr_auto_auto_auto] items-center gap-2.5 rounded-md border border-border bg-[var(--tint-hover)] px-2.5 py-2"
              >
                <MailIcon className="size-3.5 text-muted-foreground" />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate font-mono text-[12px] text-foreground">
                    {i.email}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    Invited {i.invitedAt} by {i.invitedBy}
                  </span>
                </div>
                <RoleChip
                  label={ROLE_DEFS[i.role].label}
                  tone={ROLE_DEFS[i.role].tone}
                />
                <Button variant="tertiary" size="sm" disabled>
                  <SendIcon />
                  Resend
                </Button>
                <Button
                  variant="tertiary"
                  size="icon-sm"
                  aria-label="Revoke"
                  onClick={() => onRevokeInvite(i.id)}
                >
                  <XIcon />
                </Button>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {!canManage ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--tint-hover)] px-3 py-2.5 text-[12.5px] text-muted-foreground">
          <InfoIcon className="size-3.5" />
          You&apos;re a {ROLE_DEFS[workspace.role].label} here. Only owners and
          admins can change membership.
        </div>
      ) : null}
    </div>
  )
}

function MemberRow({
  member,
  actorRole,
  onChangeRole,
  onRemove,
}: {
  member: WorkspaceMemberRow
  actorRole: WorkspaceRole
  onChangeRole: (id: string, role: WorkspaceRole) => void
  onRemove: (id: string) => void
}) {
  const lockedRole = !canChangeMemberRole(actorRole, member)
  const lockedRemove = !canRemoveMember(actorRole, member)
  return (
    <div className="grid grid-cols-[32px_1fr_110px_90px_130px_24px] items-center gap-3 border-b border-border px-2 py-2.5 transition-colors hover:bg-[var(--tint-hover)]">
      <TonalAvatar name={member.name} size="md" />
      <div className="flex min-w-0 flex-col leading-tight">
        <span className="inline-flex items-center gap-1.5 truncate text-[13.5px] font-medium text-foreground">
          {member.name}
          {member.you ? (
            <span className="rounded-xs bg-[var(--tint-hover)] px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
              you
            </span>
          ) : null}
        </span>
        <span className="truncate font-mono text-[11px] text-muted-foreground">
          {member.email}
        </span>
      </div>
      <span className="text-[12px] tabular-nums text-muted-foreground">
        {member.joined}
      </span>
      <span className="text-[12px] tabular-nums text-muted-foreground">
        {member.lastActive}
      </span>
      <Select
        value={member.role}
        disabled={lockedRole}
        onValueChange={(v) => onChangeRole(member.id, v as WorkspaceRole)}
      >
        <SelectTrigger className="w-full text-[12.5px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ROLE_ORDER.filter(
            (r) => r !== "owner" || member.role === "owner"
          ).map((r) => (
            <SelectItem key={r} value={r}>
              {ROLE_DEFS[r].label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <button
        type="button"
        disabled={lockedRemove}
        onClick={() => onRemove(member.id)}
        title={
          member.role === "owner"
            ? "Owner cannot be removed"
            : "Remove from workspace"
        }
        className={cn(
          "inline-flex size-6 items-center justify-center rounded-xs text-muted-foreground transition-colors duration-(--dur-fast)",
          "hover:bg-coral-500/15 hover:text-coral-700",
          "disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
        )}
      >
        <XIcon className="size-3" />
      </button>
    </div>
  )
}
