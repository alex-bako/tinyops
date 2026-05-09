import type { AvatarTone } from "@workspace/ui/components/tonal-avatar"

export type StepId =
  | "name"
  | "vertical"
  | "workspace"
  | "sensitivity"
  | "source"
  | "invite"
  | "done"

export type Step = { id: StepId; label: string }

export type SensitivityId = "strict" | "balanced" | "lenient"

export type VerticalId =
  | "therapy"
  | "coaching"
  | "course"
  | "agency"
  | "other"

export type SourceId = "imap" | "csv" | "forms" | "skip"

export type TeamMode = "solo" | "team"

export type InviteRole = "admin" | "operator" | "reviewer" | "viewer"

export type Invite = { email: string; role: InviteRole }

export type OnboardingData = {
  firstName: string
  lastName: string
  senderName: string
  vertical: VerticalId | null
  workspaceName: string
  handle: string
  iconLetter: string
  iconTone: AvatarTone
  teamMode: TeamMode
  sensitivity: SensitivityId
  source: SourceId | null
  imapHost: string
  imapPort: string
  imapEncryption: "ssl" | "starttls" | "none"
  imapUsername: string
  imapPassword: string
  imapHistoryWindow: "30d" | "90d" | "12mo" | "all"
  invites: Invite[]
}

export type SkippedMap = Partial<Record<StepId, boolean>>

export type StepProps = {
  data: OnboardingData
  set: (patch: Partial<OnboardingData>) => void
}
