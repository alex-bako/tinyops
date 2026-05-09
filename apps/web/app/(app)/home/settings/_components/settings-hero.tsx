"use client"

import { Settings2Icon } from "lucide-react"

import { RoleChip } from "@workspace/ui/components/role-chip"
import { Eyebrow, H1 } from "@workspace/ui/components/typography"
import { WorkspaceIcon } from "@workspace/ui/components/workspace-icon"

import { ROLE_DEFS } from "@/features/workspaces/catalog"
import type { Workspace } from "@/features/workspaces/types"

export function SettingsHero({ workspace }: { workspace: Workspace }) {
  const def = ROLE_DEFS[workspace.role]
  return (
    <div className="flex items-center gap-4 border-b border-border pb-6">
      <WorkspaceIcon icon={workspace.icon} size={48} />
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <Eyebrow className="inline-flex items-center gap-1.5 [&>svg]:size-3.5">
          <Settings2Icon />
          <span>Workspace settings</span>
        </Eyebrow>
        <H1 className="m-0 text-[32px] font-bold leading-[1.05] tracking-[-0.025em] text-foreground">
          {workspace.name}
        </H1>
        <div className="inline-flex flex-wrap items-center gap-2 text-[12.5px] text-muted-foreground">
          <RoleChip label={def.label} tone={def.tone} you />
          <span aria-hidden className="text-muted-foreground/55">
            ·
          </span>
          <span>{workspace.type}</span>
          <span aria-hidden className="text-muted-foreground/55">
            ·
          </span>
          <span className="font-mono text-[11.5px]">
            tinyops.app/{workspace.handle}
          </span>
        </div>
      </div>
    </div>
  )
}
