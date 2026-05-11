"use client"

import * as React from "react"
import { ArchiveIcon, LogOutIcon, Trash2Icon, UserCogIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"

import { canLeaveWorkspace } from "@/features/workspaces/policy"
import type {
  Workspace,
  WorkspaceUsageSnapshot,
} from "@/features/workspaces/types"

export function SectionDanger({
  workspace,
  usage,
  onArchive,
}: {
  workspace: Workspace
  usage: WorkspaceUsageSnapshot
  onArchive: (workspaceId: string) => void
}) {
  const isOwner = workspace.role === "owner"
  const canLeave = canLeaveWorkspace(workspace)
  const { counts } = usage
  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] leading-[1.2] font-semibold tracking-[-0.02em] text-foreground">
          Danger zone
        </h2>
        <p className="m-0 max-w-[60ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          Irreversible actions. Read carefully.
        </p>
      </div>

      <DangerRow
        title="Leave this workspace"
        description={
          <>
            You&apos;ll lose access to {counts.clients.toLocaleString()} clients
            tracked here.
          </>
        }
        action={
          <Button variant="secondary" size="sm" disabled={!canLeave}>
            <LogOutIcon />
            {canLeave ? "Leave workspace" : "Owner cannot leave"}
          </Button>
        }
      />

      {isOwner ? (
        <>
          <DangerRow
            title="Transfer ownership"
            description="Hand the workspace to another admin. You become an admin afterwards."
            action={
              <Button variant="secondary" size="sm">
                <UserCogIcon />
                Transfer…
              </Button>
            }
          />
          <DangerRow
            title="Archive workspace"
            description="Hides it from the switcher. Data is retained. Reversible."
            action={
              <Button
                variant="secondary"
                size="sm"
                onClick={() => onArchive(workspace.id)}
              >
                <ArchiveIcon />
                Archive
              </Button>
            }
          />
          <DangerRow
            tone="destructive"
            title="Delete this workspace"
            description={
              <>
                Permanently removes {counts.clients.toLocaleString()} clients,{" "}
                {counts.sources} data sources, and the audit log. Cannot be
                undone.
              </>
            }
            action={
              <Button
                variant="primary"
                size="sm"
                disabled
                className="bg-coral-700 hover:bg-coral-700/90"
              >
                <Trash2Icon />
                Delete…
              </Button>
            }
          />
        </>
      ) : null}
    </div>
  )
}

function DangerRow({
  title,
  description,
  action,
  tone = "neutral",
}: {
  title: string
  description: React.ReactNode
  action: React.ReactNode
  tone?: "neutral" | "destructive"
}) {
  return (
    <div
      className={cn(
        "mt-3 flex items-center gap-3 rounded-md border border-border px-3.5 py-3 first:mt-0",
        tone === "destructive" && "border-coral-500/50 bg-coral-500/[0.08]"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span
          className={cn(
            "text-[13.5px] font-medium",
            tone === "destructive" ? "text-coral-700" : "text-foreground"
          )}
        >
          {title}
        </span>
        <span className="text-[12.5px] leading-[1.5] text-muted-foreground">
          {description}
        </span>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}
