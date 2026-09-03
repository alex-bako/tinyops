import type { DataSource } from "@/lib/sources"

export function sourceAdapterKey(source: DataSource) {
  const imap = source.kind === "data_source" ? source.imap : undefined
  const forms = source.kind === "data_source" ? source.forms : undefined
  const stripe = source.kind === "data_source" ? source.stripe : undefined

  return [
    source.id,
    source.kind === "data_source" ? source.sourceSlug : "",
    source.title,
    source.kind === "data_source" ? source.sourceId : "catalog",
    source.connected ? "connected" : "disconnected",
    imap?.host ?? "",
    imap?.port ?? "",
    imap?.encryption ?? "",
    imap?.username ?? "",
    imap?.historyWindow ?? "",
    imap?.watchedFolders.join("\u0000") ?? "",
    imap?.skipSenders.join("\u0000") ?? "",
    imap?.availableFolders.map((folder) => folder.path).join("\u0000") ?? "",
    JSON.stringify(imap?.messageFilters ?? null),
    forms?.connections
      .map((connection) =>
        [
          connection.sourceId,
          connection.displayName,
          connection.externalFormId,
          connection.connectionMode,
          connection.mapping.identityColumn,
          connection.mapping.timestampColumn,
          connection.identityQuestionId ?? "",
          connection.latestUpload?.id ?? "",
        ].join("\u0000")
      )
      .join("\u0001") ?? "",
    stripe?.accountId ?? "",
    stripe?.syncFrom ?? "",
    stripe?.apiKeyMasked ?? "",
  ].join("|")
}
