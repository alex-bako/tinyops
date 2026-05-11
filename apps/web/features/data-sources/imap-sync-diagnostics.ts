export type ImapSkipReason =
  | "missing_source"
  | "skip_sender"
  | "no_external_participant"
  | "filter_rejected"
  | "unlinked_sent_message"
  | "duplicate_message"

export type ImapFolderDiagnostics = {
  path: string
  uidValidity: string
  startUid?: number
  endUid?: number
  searched: number
  fetched: number
  accepted: number
  skipped: number
  truncated: boolean
}

export type ImapSyncDiagnostics = {
  folders: ImapFolderDiagnostics[]
  skips: Record<string, number>
  sentFolders: string[]
}

export function createImapSyncDiagnostics({
  sentFolders,
}: {
  sentFolders: string[]
}): ImapSyncDiagnostics {
  return { folders: [], skips: {}, sentFolders }
}

export function appendFolderDiagnostics({
  diagnostics,
  folder,
  skips,
}: {
  diagnostics: ImapSyncDiagnostics
  folder: ImapFolderDiagnostics
  skips: Record<string, number>
}): ImapSyncDiagnostics {
  return {
    ...diagnostics,
    folders: [...diagnostics.folders, folder],
    skips: mergeSkips(diagnostics.skips, skips),
  }
}

export function recordImapSkip(
  skips: Record<string, number>,
  reason: ImapSkipReason
) {
  return {
    ...skips,
    [reason]: (skips[reason] ?? 0) + 1,
  }
}

function mergeSkips(
  current: Record<string, number>,
  next: Record<string, number>
) {
  const merged = { ...current }
  for (const [reason, count] of Object.entries(next)) {
    merged[reason] = (merged[reason] ?? 0) + count
  }
  return merged
}
