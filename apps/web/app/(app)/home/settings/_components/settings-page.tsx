"use client"

import * as React from "react"

import { useWorkspaceFeature } from "@/features/workspaces/context"
import {
  buildSettingsRailView,
  type SettingsSectionId,
} from "@/features/workspaces/view-models"

import { SettingsHero } from "./settings-hero"
import { SettingsRail } from "./settings-rail"
import { SectionGeneral } from "./section-general"
import { SectionMembers } from "./section-members"
import { SectionRoles } from "./section-roles"
import { SectionSensitivity } from "./section-sensitivity"
import { SectionNotifications } from "./section-notifications"
import { SectionBilling } from "./section-billing"
import { SectionAudit } from "./section-audit"
import { SectionDanger } from "./section-danger"

export function SettingsPage() {
  const { state, commands } = useWorkspaceFeature()
  const workspace = state.active
  const usage = state.activeUsage
  const [active, setActive] = React.useState<SettingsSectionId>("general")
  const railView = buildSettingsRailView({ active, role: workspace.role })

  React.useEffect(() => {
    if (!railView.sections.some((section) => section.id === active)) {
      setActive("general")
    }
  }, [active, railView.sections])

  const sectionContent = (() => {
    switch (active) {
      case "general":
        return (
          <SectionGeneral
            workspace={workspace}
            onUpdateProfile={commands.updateWorkspaceProfile}
          />
        )
      case "members":
        return (
          <SectionMembers
            workspace={workspace}
            onInvite={commands.inviteMember}
            onChangeRole={commands.changeMemberRole}
            onRemoveMember={commands.removeMember}
            onRevokeInvite={commands.revokeInvitation}
          />
        )
      case "roles":
        return <SectionRoles workspace={workspace} />
      case "sensitivity":
        return (
          <SectionSensitivity
            workspace={workspace}
            onUpdateSensitivity={commands.updateSensitivity}
          />
        )
      case "notifications":
        return <SectionNotifications />
      case "billing":
        return <SectionBilling workspace={workspace} usage={usage} />
      case "audit":
        return <SectionAudit />
      case "danger":
        return (
          <SectionDanger
            workspace={workspace}
            usage={usage}
            onArchive={commands.archiveWorkspace}
          />
        )
    }
  })()

  return (
    <div className="mx-auto w-full max-w-[1100px] px-6 pt-10 pb-24 md:px-14 md:pt-14">
      <SettingsHero workspace={workspace} />
      <div className="mt-7 grid items-start gap-x-14 gap-y-8 md:grid-cols-[200px_minmax(0,1fr)]">
        <SettingsRail sections={railView.sections} onSelect={setActive} />
        <div className="max-w-[760px] min-w-0">{sectionContent}</div>
      </div>
    </div>
  )
}
