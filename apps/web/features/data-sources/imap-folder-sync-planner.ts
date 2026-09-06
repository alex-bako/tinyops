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
  const sentPaths = new Set(sentFolders)
  const watched = source.intake.watchedFolders.flatMap((path) =>
    !preview && sentPaths.has(path) ? [] : [{ path, role: "watched" as const }]
  )
  if (preview) return watched

  return [
    ...watched,
    ...sentFolders.map((path) => ({ path, role: "sent" as const })),
  ]
}
