import type { DataSource } from "@/lib/sources"

export function sourceAdapterKey(source: DataSource) {
  return [
    source.id,
    source.sourceRowId ?? "catalog",
    source.connected ? "connected" : "disconnected",
    source.imap?.host ?? "",
    source.imap?.port ?? "",
    source.imap?.encryption ?? "",
    source.imap?.username ?? "",
    source.imap?.historyWindow ?? "",
    source.imap?.watchedFolders.join("\u0000") ?? "",
    source.imap?.skipSenders.join("\u0000") ?? "",
    source.imap?.availableFolders.map((folder) => folder.path).join("\u0000") ?? "",
    JSON.stringify(source.imap?.messageFilters ?? null),
  ].join("|")
}
