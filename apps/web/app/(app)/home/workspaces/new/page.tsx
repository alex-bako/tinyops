import { PlusIcon } from "lucide-react"

import {
  WorkspacePageHeader,
  WorkspacePageSurface,
} from "@/components/page-surface"

import { CreateWorkspaceForm } from "./_components/create-workspace-form"

export default function NewWorkspacePage() {
  return (
    <WorkspacePageSurface width="narrow">
      <WorkspacePageHeader
        eyebrowIcon={PlusIcon}
        eyebrow="Workspace"
        title="Create workspace"
        description="Set up a private workspace for a practice, cohort, or small team."
      />
      <CreateWorkspaceForm />
    </WorkspacePageSurface>
  )
}
