import type { ImapConfig } from "@/features/data-sources/types"

export type ImapConfigDraft = {
  host: string
  port: number | string
  encryption: string
  username: string
  historyWindow: string
  watchedFolders: string[]
  skipSenders: string[]
}

export type ImapConnectionSettingsCommand = {
  host: string
  port: number | string
  encryption: string
  username: string
  password?: string
}

export type ImapImportSettingsCommand = {
  historyWindow: string
  watchedFolders: string[]
  skipSenders: string[]
}

export type ImapConnectionPatch = Pick<
  ImapConfig,
  "host" | "port" | "encryption" | "username"
>

export type ImapImportSettingsPatch = Pick<
  ImapConfig,
  "historyWindow" | "watchedFolders" | "skipSenders"
>

export function normalizeImapConfigDraft(input: ImapConfigDraft): ImapConfig {
  return {
    ...buildImapConnectionPatch(input),
    ...buildImapImportSettingsPatch(input),
  }
}

export function buildImapConnectionPatch(
  input: ImapConnectionSettingsCommand
): ImapConnectionPatch {
  const host = input.host.trim().toLowerCase()
  const username = input.username.trim()
  const port = Number(input.port)

  if (!host || !username || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("invalid_imap_config")
  }

  return {
    host,
    port,
    encryption: coerceImapEncryption(input.encryption),
    username,
  }
}

export function buildImapImportSettingsPatch(
  input: ImapImportSettingsCommand
): ImapImportSettingsPatch {
  const watchedFolders = normalizeStringList(input.watchedFolders)

  return {
    historyWindow: coerceImapHistoryWindow(input.historyWindow),
    watchedFolders: watchedFolders.length > 0 ? watchedFolders : ["INBOX"],
    skipSenders: normalizeStringList(input.skipSenders),
  }
}

export function applyImapConfigPatch(
  current: ImapConfig,
  patch: Partial<ImapConfig>
): ImapConfig {
  return {
    ...current,
    ...patch,
  }
}

function normalizeStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

export function coerceImapEncryption(value: unknown): ImapConfig["encryption"] {
  if (value === "starttls" || value === "none") return value
  return "ssl"
}

export function coerceImapHistoryWindow(
  value: unknown
): ImapConfig["historyWindow"] {
  if (value === "30d" || value === "90d" || value === "all") return value
  return "12mo"
}
