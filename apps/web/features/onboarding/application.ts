import type {
  DataSourceStore,
  ImapConnectionConfig,
  ImapFolderSnapshot,
  ImapIntakeSettings,
  ImapConnectionTester,
} from "@/features/data-sources/types"
import {
  buildDefaultImapIntakeSettings,
  buildImapConnectionConfig,
  buildImapFolderSnapshot,
} from "@/features/data-sources/imap"
import { slugify } from "@/features/workspaces/use-cases"
import type {
  AutoSendThreshold,
  SensitivityMode,
  WorkspaceRole,
  WorkspaceSensitivity,
  WorkspaceTone,
} from "@/features/workspaces/types"
import { normalizeEmail } from "@/lib/auth/email"

export type OnboardingVertical =
  | "therapy"
  | "coaching"
  | "course"
  | "agency"
  | "other"

export type OnboardingSensitivity = "strict" | "balanced" | "lenient"
export type OnboardingSourceIntent = "imap" | "csv" | "forms" | "skip"
export type OnboardingInviteRole = Exclude<WorkspaceRole, "owner">

export type OnboardingImapSourceCommand = {
  type: "imap"
  host: string
  port: number | string
  encryption: string
  username: string
  password: string
  historyWindow: string
  watchedFolders: string[]
  skipSenders: string[]
}

export type OnboardingCommand = {
  firstName: string
  lastName?: string
  senderName: string
  workspaceName: string
  workspaceHandle?: string
  iconLetter?: string
  iconTone?: WorkspaceTone
  vertical: OnboardingVertical
  sensitivity: OnboardingSensitivity
  source:
    | OnboardingImapSourceCommand
    | { type: Exclude<OnboardingSourceIntent, "imap"> }
  invites?: Array<{
    email: string
    role: OnboardingInviteRole
  }>
}

export type OnboardingPersistenceInput = {
  actorUserId: string
  actorEmail: string
  profile: {
    firstName: string
    lastName: string | null
    onboardedAt: string
  }
  workspace: {
    name: string
    handle: string
    iconKind: "letter"
    iconLetter: string
    iconTone: WorkspaceTone
    accent: WorkspaceTone
    vertical: OnboardingVertical
    defaultSenderName: string
    initialSourceIntent: OnboardingSourceIntent
    sensitivity: WorkspaceSensitivity
  }
  invites: Array<{
    email: string
    role: OnboardingInviteRole
  }>
}

export type OnboardingStore = {
  completeOnboarding(
    input: OnboardingPersistenceInput
  ): Promise<{ workspaceId: string }>
}

export type OnboardingActor = {
  userId: string
  email: string | null
}

export type OnboardingValidationError =
  | "not_authenticated"
  | "first_name_required"
  | "workspace_name_required"
  | "workspace_handle_required"
  | "invalid_vertical"
  | "invalid_sensitivity"
  | "invalid_source"
  | "invalid_invite_email"
  | "invalid_invite_role"
  | "invalid_imap_config"
  | "onboarding_failed"

export type OnboardingResult =
  | {
      status: "completed"
      workspaceId: string
      warning?: "source_connection_failed"
    }
  | { status: "validation_error"; error: OnboardingValidationError }
  | {
      status: "source_error"
      error: "imap_connection_failed"
      fallback: "skip_source"
    }

const VERTICALS = new Set<OnboardingVertical>([
  "therapy",
  "coaching",
  "course",
  "agency",
  "other",
])

const SENSITIVITIES = new Set<OnboardingSensitivity>([
  "strict",
  "balanced",
  "lenient",
])

const INVITE_ROLES = new Set<OnboardingInviteRole>([
  "admin",
  "operator",
  "reviewer",
  "viewer",
])

export function createOnboardingApplication({
  actor,
  store,
  dataSourceStore,
  imapConnectionTester,
  now = () => new Date(),
}: {
  actor: OnboardingActor | null
  store: OnboardingStore
  dataSourceStore: DataSourceStore
  imapConnectionTester: ImapConnectionTester
  now?: () => Date
}) {
  return {
    async complete(command: OnboardingCommand): Promise<OnboardingResult> {
      const normalized = normalizeCommand({ actor, command, now })
      if ("error" in normalized) {
        return { status: "validation_error", error: normalized.error }
      }

      let imapConnection: ImapConnectionConfig | null = null
      let imapIntake: ImapIntakeSettings | null = null
      let imapFolderSnapshot: ImapFolderSnapshot | null = null
      let imapPassword = ""
      if (command.source.type === "imap") {
        try {
          imapConnection = buildImapConnectionConfig(command.source)
          imapPassword = command.source.password.trim()
          if (!imapPassword) {
            return { status: "validation_error", error: "invalid_imap_config" }
          }
          const result = await imapConnectionTester.test({
            ...imapConnection,
            password: imapPassword,
          })
          imapFolderSnapshot = buildImapFolderSnapshot(result.folders)
          imapIntake = buildDefaultImapIntakeSettings({
            historyWindow: command.source.historyWindow,
            folderSnapshot: imapFolderSnapshot,
          })
        } catch (error) {
          if (isInvalidImapConfigError(error)) {
            return { status: "validation_error", error: "invalid_imap_config" }
          }
          return {
            status: "source_error",
            error: "imap_connection_failed",
            fallback: "skip_source",
          }
        }
      }

      let completed: { workspaceId: string }
      try {
        completed = await store.completeOnboarding(normalized.input)
      } catch {
        return { status: "validation_error", error: "onboarding_failed" }
      }

      if (imapConnection && imapIntake && imapFolderSnapshot) {
        try {
          await dataSourceStore.connectImap({
            workspaceId: completed.workspaceId,
            connection: imapConnection,
            intake: imapIntake,
            folderSnapshot: imapFolderSnapshot,
            password: imapPassword,
          })
        } catch {
          return {
            status: "completed",
            workspaceId: completed.workspaceId,
            warning: "source_connection_failed",
          }
        }
      }

      return { status: "completed", workspaceId: completed.workspaceId }
    },
  }
}

function normalizeCommand({
  actor,
  command,
  now,
}:
  | {
      actor: OnboardingActor | null
      command: OnboardingCommand
      now: () => Date
    }
  | never):
  | { input: OnboardingPersistenceInput }
  | { error: OnboardingValidationError } {
  const actorEmail = normalizeEmail(actor?.email)
  if (!actor || !actorEmail) return { error: "not_authenticated" }

  const firstName = command.firstName.trim()
  if (!firstName) return { error: "first_name_required" }

  const workspaceName = command.workspaceName.trim()
  if (!workspaceName) return { error: "workspace_name_required" }

  const handle = slugify(command.workspaceHandle || workspaceName)
  if (handle.length < 3) return { error: "workspace_handle_required" }

  if (!VERTICALS.has(command.vertical)) return { error: "invalid_vertical" }
  if (!SENSITIVITIES.has(command.sensitivity)) {
    return { error: "invalid_sensitivity" }
  }
  if (!isSourceIntent(command.source.type)) return { error: "invalid_source" }

  const invites = []
  for (const invite of command.invites ?? []) {
    const email = normalizeEmail(invite.email)
    if (!email) {
      if (invite.email.trim()) return { error: "invalid_invite_email" }
      continue
    }
    if (!INVITE_ROLES.has(invite.role)) return { error: "invalid_invite_role" }
    invites.push({ email, role: invite.role })
  }

  const lastName = command.lastName?.trim() || null
  const defaultSenderName =
    command.senderName.trim() || [firstName, lastName].filter(Boolean).join(" ")
  const iconLetter = (
    command.iconLetter?.trim() ||
    workspaceName.at(0) ||
    "T"
  )
    .at(0)!
    .toUpperCase()
  const iconTone = command.iconTone ?? "cobalt"

  return {
    input: {
      actorUserId: actor.userId,
      actorEmail,
      profile: {
        firstName,
        lastName,
        onboardedAt: now().toISOString(),
      },
      workspace: {
        name: workspaceName,
        handle,
        iconKind: "letter",
        iconLetter,
        iconTone,
        accent: iconTone,
        vertical: command.vertical,
        defaultSenderName,
        initialSourceIntent: command.source.type,
        sensitivity: sensitivityDefaults(command.sensitivity),
      },
      invites,
    },
  }
}

function isSourceIntent(value: string): value is OnboardingSourceIntent {
  return (
    value === "imap" || value === "csv" || value === "forms" || value === "skip"
  )
}

function sensitivityDefaults(
  sensitivity: OnboardingSensitivity
): WorkspaceSensitivity {
  const thresholds: Record<OnboardingSensitivity, AutoSendThreshold> = {
    strict: "low-only",
    balanced: "low-and-medium",
    lenient: "everything",
  }

  return {
    mode: sensitivity as SensitivityMode,
    autoSendThreshold: thresholds[sensitivity],
    manualReviewKeywords: ["crisis", "trauma"],
    excludeFromOutbound: true,
  }
}

function isInvalidImapConfigError(error: unknown) {
  return error instanceof Error && error.message === "invalid_imap_config"
}
