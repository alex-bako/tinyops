import type {
  ImapConnectionConfig,
  ImapEncryption,
  ImapFolder,
  ImapFolderSnapshot,
  ImapHistoryWindow,
  ImapIntakeSettings,
  ImapMessageFilterField,
  ImapMessageFilterOperator,
  ImapMessageFilters,
} from "@/features/data-sources/types"

export type ImapConnectionSettingsCommand = {
  host: string
  port: number | string
  encryption: string
  username: string
  password?: string
}

export type ImapMessageFilterRuleCommand = {
  id?: string
  field: string
  operator: string
  value: string
}

export type ImapMessageFiltersCommand = {
  mode?: string
  rules?: ImapMessageFilterRuleCommand[]
}

export type ImapIntakeSettingsCommand = {
  historyWindow?: string
  watchedFolders?: string[]
  skipSenders?: string[]
  messageFilters?: ImapMessageFiltersCommand
}

export type ImapConnectCommandDraft = ImapConnectionSettingsCommand &
  ImapIntakeSettingsCommand & {
    password: string
  }

export function buildImapConnectionConfig(
  input: ImapConnectionSettingsCommand
): ImapConnectionConfig {
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

export function buildImapIntakeSettings(
  input: ImapIntakeSettingsCommand
): ImapIntakeSettings {
  const watchedFolders = normalizeStringList(input.watchedFolders ?? [])

  return {
    historyWindow: coerceImapHistoryWindow(input.historyWindow),
    watchedFolders: watchedFolders.length > 0 ? watchedFolders : ["INBOX"],
    skipSenders: normalizeStringList(input.skipSenders ?? []),
    messageFilters: normalizeImapMessageFilters(input.messageFilters),
  }
}

export function buildDefaultImapIntakeSettings({
  historyWindow,
  folderSnapshot,
}: {
  historyWindow?: string
  folderSnapshot: ImapFolderSnapshot
}): ImapIntakeSettings {
  const folders = folderSnapshot.availableFolders
  const inbox = folders.find((folder) => folder.path.toUpperCase() === "INBOX")
  const firstFolder = folders.at(0)

  return {
    historyWindow: coerceImapHistoryWindow(historyWindow),
    watchedFolders: [inbox?.path ?? firstFolder?.path ?? "INBOX"],
    skipSenders: [],
    messageFilters: { mode: "and", rules: [] },
  }
}

export function buildImapFolderSnapshot(value: unknown): ImapFolderSnapshot {
  return {
    availableFolders: coerceImapFolders(value),
  }
}

function coerceImapFolders(value: unknown): ImapFolder[] {
  if (!Array.isArray(value)) return []

  const folders = value
    .map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
        return null
      }
      const path = "path" in entry ? String(entry.path).trim() : ""
      if (!path) return null

      const messages =
        "messages" in entry &&
        typeof entry.messages === "number" &&
        Number.isInteger(entry.messages) &&
        entry.messages >= 0
          ? entry.messages
          : null

      const specialUse =
        "specialUse" in entry && typeof entry.specialUse === "string"
          ? entry.specialUse.trim() || null
          : null
      const flags =
        "flags" in entry && isIterable(entry.flags)
          ? Array.from(entry.flags)
              .filter((flag): flag is string => typeof flag === "string")
              .map((flag) => flag.trim())
              .filter(Boolean)
          : []

      return {
        path,
        messages,
        ...(specialUse ? { specialUse } : {}),
        ...(flags.length > 0 ? { flags } : {}),
      }
    })
    .filter((entry): entry is ImapFolder => entry !== null)

  return Array.from(new Map(folders.map((folder) => [folder.path, folder])).values())
}

function isIterable(value: unknown): value is Iterable<unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    Symbol.iterator in value
  )
}

export function normalizeImapMessageFilters(
  input: unknown
): ImapMessageFilters {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { mode: "and", rules: [] }
  }

  const candidate = input as { rules?: unknown }
  const rules = Array.isArray(candidate.rules) ? candidate.rules : []

  return {
    mode: "and",
    rules: rules
      .map((rule, index) => normalizeImapMessageFilterRule(rule, index))
      .filter((rule): rule is ImapMessageFilters["rules"][number] => rule !== null),
  }
}

function normalizeImapMessageFilterRule(
  value: unknown,
  index: number
): ImapMessageFilters["rules"][number] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null

  const field = normalizeFilterField(readString(value, "field"))
  const operator = normalizeFilterOperator(readString(value, "operator"))
  const ruleValue = readString(value, "value").trim()
  if (!ruleValue) return null

  return {
    id: readString(value, "id").trim() || `rule_${index + 1}`,
    field,
    operator,
    value: ruleValue,
  }
}

function readString(value: object, key: string) {
  return key in value && typeof value[key as keyof typeof value] === "string"
    ? String(value[key as keyof typeof value])
    : ""
}

function normalizeFilterField(value: string): ImapMessageFilterField {
  const normalized = value.trim().toLowerCase()
  if (
    normalized === "from" ||
    normalized === "to" ||
    normalized === "subject" ||
    normalized === "body"
  ) {
    return normalized
  }
  return "from"
}

function normalizeFilterOperator(value: string): ImapMessageFilterOperator {
  const normalized = value.trim().toLowerCase().replaceAll(" ", "_")
  if (
    normalized === "is" ||
    normalized === "is_not" ||
    normalized === "contains" ||
    normalized === "does_not_contain"
  ) {
    return normalized
  }
  return "contains"
}

function normalizeStringList(values: string[]) {
  return values.map((value) => value.trim()).filter(Boolean)
}

export function coerceImapEncryption(value: unknown): ImapEncryption {
  if (value === "starttls" || value === "none") return value
  return "ssl"
}

export function coerceImapHistoryWindow(value: unknown): ImapHistoryWindow {
  if (value === "30d" || value === "90d" || value === "all") return value
  return "12mo"
}
