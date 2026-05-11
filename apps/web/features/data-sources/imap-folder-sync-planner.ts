import type { ImapDataSource } from "@/features/data-sources/types"

export type ImapFolderRole = "watched" | "sent"

export type ImapFolderSyncPlanItem = {
  path: string
  role: ImapFolderRole
}

export function planImapFolderSync({
  source,
  sentFolders,
  preview,
}: {
  source: ImapDataSource
  sentFolders: string[]
  preview: boolean
}): ImapFolderSyncPlanItem[] {
  const watched = source.intake.watchedFolders.map((path) => ({
    path,
    role: "watched" as const,
  }))
  if (preview) return watched

  const watchedPaths = new Set(source.intake.watchedFolders)
  return [
    ...watched,
    ...sentFolders
      .filter((path) => !watchedPaths.has(path))
      .map((path) => ({ path, role: "sent" as const })),
  ]
}
