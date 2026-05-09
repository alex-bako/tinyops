"use client"

import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"

import type {
  SettingsSectionId,
  SettingsSectionView,
} from "@/features/workspaces/view-models"

export function SettingsRail({
  sections,
  onSelect,
}: {
  sections: SettingsSectionView[]
  onSelect: (id: SettingsSectionId) => void
}) {
  return (
    <nav className="sticky top-6 flex flex-col gap-px">
      <div className="px-2.5 pb-2 pt-1 text-[10.5px] font-medium uppercase tracking-[0.05em] text-muted-foreground">
        Workspace
      </div>
      {sections.map((s) => {
        const Icon = s.icon
        const isActive = s.active
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            data-active={isActive || undefined}
            className={cn(
              "flex h-[30px] items-center gap-2 rounded-md px-2.5 text-left text-[13px] transition-colors duration-(--dur-fast)",
              isActive
                ? "bg-[var(--tint-hover)] font-medium text-foreground"
                : "text-muted-foreground hover:bg-[var(--tint-hover)] hover:text-foreground",
              s.danger &&
                (isActive
                  ? "bg-coral-500/10 text-coral-700"
                  : "text-coral-700 hover:bg-coral-500/10 hover:text-coral-700"),
              "[&>svg]:size-3.5",
              isActive && !s.danger && "[&>svg]:text-cobalt-500",
              s.danger && "[&>svg]:text-coral-700"
            )}
          >
            <Icon />
            <span>{s.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
