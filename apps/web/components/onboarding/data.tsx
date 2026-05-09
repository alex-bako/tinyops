import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import {
  BriefcaseIcon,
  CircleDashedIcon,
  CompassIcon,
  FeatherIcon,
  FileTextIcon,
  GraduationCapIcon,
  HeartHandshakeIcon,
  ListChecksIcon,
  MailIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from "lucide-react"

import type {
  OnboardingData,
  SensitivityId,
  SourceId,
  Step,
  VerticalId,
} from "./types"

export const VERTICALS: ReadonlyArray<{
  id: VerticalId
  label: string
  sub: string
  icon: LucideIcon
  sensitivity: SensitivityId
}> = [
  {
    id: "therapy",
    label: "Therapy or counseling",
    sub: "1:1 client work — sensitive content protected by default.",
    icon: HeartHandshakeIcon,
    sensitivity: "strict",
  },
  {
    id: "coaching",
    label: "Coaching",
    sub: "Group or 1:1 coaching engagements.",
    icon: CompassIcon,
    sensitivity: "balanced",
  },
  {
    id: "course",
    label: "Course creator",
    sub: "Cohort-based or self-paced — students at scale.",
    icon: GraduationCapIcon,
    sensitivity: "balanced",
  },
  {
    id: "agency",
    label: "Agency or consulting",
    sub: "Client engagements with deliverables and retainers.",
    icon: BriefcaseIcon,
    sensitivity: "balanced",
  },
  {
    id: "other",
    label: "Something else",
    sub: "We'll keep defaults general. You can change anything later.",
    icon: CircleDashedIcon,
    sensitivity: "balanced",
  },
]

export const SOURCES: ReadonlyArray<{
  id: SourceId
  label: string
  sub: string
  icon: LucideIcon
  chip: string | null
}> = [
  {
    id: "imap",
    label: "Email mailbox",
    sub: "Read past emails into a unified per-client timeline.",
    icon: MailIcon,
    chip: "IMAP / Gmail / Outlook",
  },
  {
    id: "csv",
    label: "Upload a CSV",
    sub: "Import an existing client list to start with.",
    icon: FileTextIcon,
    chip: "Up to 5,000 rows",
  },
  {
    id: "forms",
    label: "Google Forms",
    sub: "Pull intake forms and waitlists into client memory.",
    icon: ListChecksIcon,
    chip: "OAuth · read-only",
  },
  {
    id: "skip",
    label: "I'll connect later",
    sub: "Sources are managed from the Sources tab anytime.",
    icon: CircleDashedIcon,
    chip: null,
  },
]

export const SENSITIVITIES: ReadonlyArray<{
  id: SensitivityId
  title: string
  blurb: string
  icon: LucideIcon
}> = [
  {
    id: "strict",
    title: "Strict",
    blurb:
      "Manual review for any flagged context. Sensitive content never quoted in drafts.",
    icon: ShieldCheckIcon,
  },
  {
    id: "balanced",
    title: "Balanced",
    blurb:
      "Auto-personalize low-risk drafts. Review medium and above. Most operators start here.",
    icon: ScaleIcon,
  },
  {
    id: "lenient",
    title: "Lenient",
    blurb:
      "Auto-personalize all. Only high-risk content is flagged for review.",
    icon: FeatherIcon,
  },
]

export const QUOTES: Record<
  Step["id"],
  { text: ReactNode; attr: string }
> = {
  name: {
    text: (
      <>
        TinyOps remembers what you&rsquo;d otherwise{" "}
        <em className="font-serif font-normal italic text-cobalt-700">
          forget
        </em>
        .
      </>
    ),
    attr: "Why we exist",
  },
  vertical: {
    text: (
      <>
        A tool used between humans about other{" "}
        <em className="font-serif font-normal italic text-cobalt-700">
          humans
        </em>
        .
      </>
    ),
    attr: "Brand principle",
  },
  workspace: {
    text: (
      <>
        Lightweight, not enterprise.{" "}
        <em className="font-serif font-normal italic text-cobalt-700">
          One screen, one verb.
        </em>
      </>
    ),
    attr: "Product principle",
  },
  sensitivity: {
    text: (
      <>
        Sensitive —{" "}
        <em className="font-serif font-normal italic text-cobalt-700">
          review manually
        </em>
        . The operator is in charge.
      </>
    ),
    attr: "Sensitivity ladder",
  },
  source: {
    text: (
      <>
        Type a client email — see{" "}
        <em className="font-serif font-normal italic text-cobalt-700">
          everything
        </em>{" "}
        about that client.
      </>
    ),
    attr: "First lovable use case",
  },
  invite: {
    text: (
      <>
        Owners, admins, operators, reviewers, viewers.{" "}
        <em className="font-serif font-normal italic text-cobalt-700">
          Roles done plainly.
        </em>
      </>
    ),
    attr: "Permissions model",
  },
  done: {
    text: (
      <>
        What I know about{" "}
        <em className="font-serif font-normal italic text-cobalt-700">Anna</em>.
      </>
    ),
    attr: "Your first client memory card",
  },
}

export function buildSteps(data: OnboardingData): Step[] {
  const base: Step[] = [
    { id: "name", label: "Your name" },
    { id: "vertical", label: "Your work" },
    { id: "workspace", label: "Workspace" },
    { id: "sensitivity", label: "Sensitivity" },
    { id: "source", label: "First source" },
  ]
  if (data.teamMode === "team") {
    base.push({ id: "invite", label: "Invite team" })
  }
  base.push({ id: "done", label: "All set" })
  return base
}

export function slugify(value: string) {
  return (value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
}

export const INITIAL_DATA: OnboardingData = {
  firstName: "",
  lastName: "",
  senderName: "",
  vertical: null,
  workspaceName: "",
  handle: "",
  iconLetter: "",
  iconTone: "cobalt",
  teamMode: "solo",
  sensitivity: "balanced",
  source: null,
  imapHost: "",
  imapPort: "993",
  imapEncryption: "ssl",
  imapUsername: "",
  imapPassword: "",
  imapHistoryWindow: "90d",
  invites: [
    { email: "", role: "operator" },
    { email: "", role: "operator" },
  ],
}
