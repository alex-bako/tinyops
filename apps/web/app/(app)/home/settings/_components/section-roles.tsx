"use client"

import * as React from "react"
import { InfoIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { PermissionPill } from "@workspace/ui/components/permission-pill"

import { CAPABILITIES, ROLE_DEFS, ROLE_ORDER } from "@/features/workspaces/catalog"
import { canEditRolePermissions } from "@/features/workspaces/policy"
import type {
  CapabilityId,
  Permissions,
  Workspace,
  WorkspaceRole,
} from "@/features/workspaces/types"

const TONE_BORDER: Record<string, string> = {
  cobalt: "border-t-cobalt-500",
  mint: "border-t-mint-500",
  citron: "border-t-citron-500",
  coral: "border-t-coral-500",
  slate: "border-t-slate-700",
}

export function SectionRoles({
  workspace,
  onToggleCapability,
}: {
  workspace: Workspace
  onToggleCapability: (role: WorkspaceRole, capability: CapabilityId) => void
}) {
  const canEdit = canEditRolePermissions(workspace.role)
  const perms: Permissions = workspace.permissions

  const toggle = (role: WorkspaceRole, cap: CapabilityId) => {
    onToggleCapability(role, cap)
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] font-bold leading-[1.2] tracking-[-0.02em] text-foreground">
          Roles &amp; permissions
        </h2>
        <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          What each role can do. Owner permissions are fixed; the rest are
          tunable per workspace.
        </p>
      </div>

      <div className="mb-7 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ROLE_ORDER.map((r) => {
          const def = ROLE_DEFS[r]
          const count = workspace.members.filter((m) => m.role === r).length
          return (
            <div
              key={r}
              className={cn(
                "flex flex-col gap-1 rounded-md border border-border bg-background p-2.5",
                "border-t-2",
                TONE_BORDER[def.tone]
              )}
            >
              <div className="flex items-baseline justify-between gap-1.5">
                <span className="text-[13px] font-semibold tracking-[-0.005em] text-foreground">
                  {def.label}
                </span>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {count} {count === 1 ? "person" : "people"}
                </span>
              </div>
              <span className="text-[11.5px] leading-[1.4] text-muted-foreground">
                {def.blurb}
              </span>
            </div>
          )
        })}
      </div>

      <div className="overflow-hidden rounded-md border border-border">
        <div className="grid grid-cols-[minmax(220px,1.6fr)_repeat(5,1fr)] items-center bg-[var(--tint-hover)] text-[11.5px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
          <span className="px-2.5 py-2">Capability</span>
          {ROLE_ORDER.map((r) => (
            <span key={r} className="px-2.5 py-2 text-center">
              {ROLE_DEFS[r].label}
            </span>
          ))}
        </div>
        {CAPABILITIES.map((c) => (
          <div
            key={c.id}
            className={cn(
              "grid grid-cols-[minmax(220px,1.6fr)_repeat(5,1fr)] items-center border-t border-border text-[13px] transition-colors hover:bg-[var(--tint-hover)]",
              c.destructive && "[&_.cap-text]:text-coral-700"
            )}
          >
            <span className="cap-text inline-flex items-center gap-2 px-2.5 py-2.5 text-foreground">
              {c.label}
              {c.sensitive ? (
                <span className="rounded-xs bg-coral-500/15 px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.04em] text-coral-700">
                  sensitive
                </span>
              ) : null}
              {c.destructive ? (
                <span className="rounded-xs bg-coral-500/20 px-1.5 py-px text-[10px] font-medium uppercase tracking-[0.04em] text-coral-700">
                  destructive
                </span>
              ) : null}
            </span>
            {ROLE_ORDER.map((r) => {
              const on = !!perms[r]?.[c.id]
              const locked = r === "owner" || !canEdit
              return (
                <span
                  key={r}
                  className="flex items-center justify-center py-1.5"
                >
                  <PermissionPill
                    on={on}
                    locked={locked}
                    onToggle={() => toggle(r, c.id)}
                  />
                </span>
              )
            })}
          </div>
        ))}
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-md bg-[var(--tint-hover)] px-3 py-2.5 text-[12.5px] text-muted-foreground">
        <InfoIcon className="size-3.5" />
        Custom roles are coming. For now, tune individual capabilities per
        built-in role.
      </div>
    </div>
  )
}
