import type { Metadata } from "next"

import { SettingsPage } from "./_components/settings-page"

export const metadata: Metadata = {
  title: "Workspace settings",
  description: "Members, plan, sensitivity rules.",
}

export default function WorkspaceSettingsPage() {
  return <SettingsPage />
}
