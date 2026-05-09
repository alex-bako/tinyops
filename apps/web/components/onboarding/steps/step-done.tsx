import {
  BriefcaseIcon,
  CheckIcon,
  InfoIcon,
  LayoutGridIcon,
  PlugZapIcon,
  ShieldCheckIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react"

import { Badge } from "@workspace/ui/components/badge"
import { WorkspaceIcon } from "@workspace/ui/components/workspace-icon"

import { SENSITIVITIES, SOURCES, VERTICALS } from "../data"
import type { OnboardingData, SkippedMap } from "../types"

export function StepDone({
  data,
  skipped,
}: {
  data: OnboardingData
  skipped: SkippedMap
}) {
  const vertical = VERTICALS.find((v) => v.id === data.vertical)
  const sensitivity = SENSITIVITIES.find((s) => s.id === data.sensitivity)!
  const source = SOURCES.find((s) => s.id === data.source)
  const filledInvites = data.invites.filter((i) => i.email.trim().length > 0)
  const previewLetter = (
    data.iconLetter ||
    data.workspaceName[0] ||
    "T"
  ).toUpperCase()

  const sensitivityBadgeVariant =
    sensitivity.id === "strict"
      ? "sensitive"
      : sensitivity.id === "balanced"
        ? "brand"
        : "warn"

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <div className="flex flex-col items-start gap-[18px]">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-mint-500/[0.12] text-mint-700">
          <CheckIcon className="size-[26px]" />
        </span>
        <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-foreground">
          You&rsquo;re all set{data.firstName ? `, ${data.firstName}` : ""}.
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          Your workspace is ready. Here&rsquo;s what we set up — change any of it
          from settings later.
        </p>
      </div>

      <div className="flex flex-col overflow-hidden rounded-md border border-[rgba(15,23,42,0.12)] bg-card">
        <RecapRow icon={<UserIcon className="size-3.5" />} label="You">
          <span className="text-foreground">
            {[data.firstName, data.lastName].filter(Boolean).join(" ") || "—"}
          </span>
          <Badge variant="tag">{data.senderName || "—"}</Badge>
        </RecapRow>

        <RecapRow icon={<BriefcaseIcon className="size-3.5" />} label="Vertical">
          <span className="text-foreground">{vertical?.label ?? "—"}</span>
        </RecapRow>

        <RecapRow
          icon={<LayoutGridIcon className="size-3.5" />}
          label="Workspace"
        >
          <WorkspaceIcon
            icon={{
              kind: "letter",
              letter: previewLetter,
              tone: data.iconTone,
            }}
            size={22}
          />
          <span className="text-foreground">
            {data.workspaceName || "Your workspace"}
          </span>
          <Badge variant="brand">tinyops.app/{data.handle || "—"}</Badge>
          <Badge variant="tag">
            {data.teamMode === "solo" ? "Solo" : "Team"}
          </Badge>
        </RecapRow>

        <RecapRow
          icon={<ShieldCheckIcon className="size-3.5" />}
          label="Sensitivity"
        >
          <Badge variant={sensitivityBadgeVariant}>{sensitivity.title}</Badge>
          <span className="text-[12.5px] text-[rgba(15,23,42,0.6)]">
            {sensitivity.blurb}
          </span>
        </RecapRow>

        <RecapRow
          icon={<PlugZapIcon className="size-3.5" />}
          label="First source"
        >
          {skipped.source || data.source === "skip" ? (
            <span className="text-[rgba(15,23,42,0.55)]">
              Skipped — connect from Sources anytime
            </span>
          ) : source ? (
            <>
              <span className="text-foreground">{source.label}</span>
              <Badge variant="tag">{source.chip ?? "Connected"}</Badge>
            </>
          ) : (
            <span>—</span>
          )}
        </RecapRow>

        {data.teamMode === "team" && (
          <RecapRow icon={<UsersIcon className="size-3.5" />} label="Team">
            {filledInvites.length === 0 || skipped.invite ? (
              <span className="text-[rgba(15,23,42,0.55)]">
                No invites sent yet
              </span>
            ) : (
              filledInvites.map((i) => (
                <Badge variant="tag" key={i.email}>
                  {i.email} · {i.role}
                </Badge>
              ))
            )}
          </RecapRow>
        )}
      </div>

      <p className="m-0 inline-flex items-center gap-1.5 text-[12px] leading-[1.5] text-[rgba(15,23,42,0.55)]">
        <InfoIcon className="size-3.5" /> Nothing has been sent. The first time
        TinyOps drafts something, you&rsquo;ll review it before it goes out.
      </p>
    </div>
  )
}

function RecapRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="grid grid-cols-[130px_1fr] gap-4 border-b border-[rgba(15,23,42,0.07)] px-4 py-3 text-[13.5px] last:border-b-0">
      <span className="inline-flex items-center gap-1.5 text-[12.5px] text-[rgba(15,23,42,0.55)]">
        {icon}
        {label}
      </span>
      <span className="inline-flex flex-wrap items-center gap-2 text-foreground">
        {children}
      </span>
    </div>
  )
}
