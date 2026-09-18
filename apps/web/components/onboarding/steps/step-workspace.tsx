import { UserIcon, UsersIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"
import { AVATAR_TONES, type AvatarTone } from "@workspace/ui/components/tonal-avatar"
import { WorkspaceIcon } from "@workspace/ui/components/workspace-icon"
import { cn } from "@workspace/ui/lib/utils"

import {
  WORKSPACE_HANDLE_MESSAGES,
  workspaceHandleIssue,
} from "@/features/workspaces/handle"
import type { WorkspaceHandleAvailability } from "@/features/workspaces/use-handle-availability"

import type { StepProps } from "../types"

const inputClass =
  "h-9 rounded-sm border-[rgba(15,23,42,0.16)] bg-card px-3 text-[14px] text-foreground placeholder:text-[rgba(15,23,42,0.3)] focus-visible:border-cobalt-500 focus-visible:ring-cobalt-500/[0.12]"

const toneSwatchClasses: Record<AvatarTone, string> = {
  cobalt: "bg-cobalt-500 text-white",
  citron: "bg-citron-500 text-foreground",
  mint: "bg-mint-500 text-white",
  coral: "bg-coral-500 text-white",
  slate: "bg-slate-700 text-white",
}

export function StepWorkspace({
  data,
  set,
  fieldError,
  availability,
}: StepProps & { availability: WorkspaceHandleAvailability }) {
  const previewLetter = (
    data.iconLetter ||
    data.workspaceName[0] ||
    "T"
  ).toUpperCase()

  // An untouched step says nothing. Once there is a name to derive from, an empty handle
  // is a real dead end - Continue is unavailable and only this can say why.
  const issue =
    data.handle || data.workspaceName
      ? workspaceHandleIssue(data.handle)
      : null
  const formatBlocking = issue !== null && issue !== "at_max_length"
  // What the server said about the value that was actually sent. It outranks both of
  // the above: it is the only one of the three that has been tried for real.
  const handleRejected = fieldError?.field === "handle" ? fieldError.message : null
  const nameRejected =
    fieldError?.field === "workspaceName" ? fieldError.message : null
  const blocking =
    formatBlocking || availability.status === "taken" || handleRejected !== null

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
          Name your workspace
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          A workspace holds your clients, sources, and sensitivity policy. You
          can have many - switch anytime.
        </p>
      </header>

      <div className="flex flex-col gap-[18px]">
        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="ob-workspace-name"
            className="text-[13px] font-medium tracking-[-0.005em] text-foreground"
          >
            Workspace name
          </Label>
          <Input
            id="ob-workspace-name"
            value={data.workspaceName}
            onChange={(e) => set({ workspaceName: e.target.value })}
            aria-invalid={nameRejected ? true : undefined}
            aria-describedby={
              nameRejected ? "ob-workspace-name-error" : undefined
            }
            placeholder="Park Therapy"
            className={inputClass}
          />
          {/* Only a server rejection speaks here. A name too short for a handle is the
              handle's problem and is reported there, not twice (OBI-11). */}
          {nameRejected && (
            <span
              id="ob-workspace-name-error"
              role="alert"
              className="text-[12px] leading-[1.5] text-coral-700"
            >
              {nameRejected}
            </span>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="ob-handle"
            className="text-[13px] font-medium tracking-[-0.005em] text-foreground"
          >
            URL handle
          </Label>
          <div className="flex items-stretch overflow-hidden rounded-sm border border-[rgba(15,23,42,0.16)] bg-card transition-colors duration-100 focus-within:border-cobalt-500 focus-within:ring-3 focus-within:ring-cobalt-500/[0.12]">
            <span className="flex items-center border-r border-[rgba(15,23,42,0.08)] bg-[rgba(15,23,42,0.04)] px-2.5 py-2 font-mono text-[12.5px] text-[rgba(15,23,42,0.55)]">
              tinyops.app/
            </span>
            <input
              id="ob-handle"
              value={data.handle}
              onChange={(e) => set({ handle: e.target.value })}
              aria-invalid={blocking || undefined}
              aria-describedby="ob-handle-hint"
              placeholder="park-therapy"
              className="flex-1 border-0 bg-transparent px-3 py-2 font-mono text-[12.5px] text-foreground outline-none"
            />
          </div>
          {/* One live region, always mounted: a role appearing together with the text it
              carries is not reliably announced. */}
          <span
            id="ob-handle-hint"
            role="status"
            className={cn(
              "text-[12px] leading-[1.5]",
              blocking ? "text-coral-700" : "text-[rgba(15,23,42,0.55)]"
            )}
          >
            {handleRejected ??
              (issue
                ? WORKSPACE_HANDLE_MESSAGES[issue]
                : availabilityMessage(availability))}
          </span>
          {availability.status === "taken" && availability.suggestion && (
            <button
              type="button"
              onClick={() => set({ handle: availability.suggestion! })}
              className="self-start rounded-xs border border-[rgba(15,23,42,0.16)] bg-card px-2 py-1 font-mono text-[12px] text-foreground hover:bg-[rgba(15,23,42,0.04)]"
            >
              Use {availability.suggestion}
            </button>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium tracking-[-0.005em] text-foreground">
            Icon
          </span>
          <div className="flex items-center gap-3">
            {AVATAR_TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                onClick={() => set({ iconTone: tone })}
                aria-pressed={data.iconTone === tone}
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-sm border border-[rgba(15,23,42,0.16)] font-sans text-[18px] font-semibold tracking-[-0.01em] transition-transform duration-100 hover:-translate-y-px",
                  toneSwatchClasses[tone],
                  data.iconTone === tone &&
                    "border-cobalt-500 shadow-[0_0_0_3px_rgba(37,99,235,0.30)]"
                )}
              >
                {previewLetter}
              </button>
            ))}
          </div>
          <span className="text-[12px] leading-[1.5] text-[rgba(15,23,42,0.55)]">
            A simple letter mark. Upload an image later from workspace
            settings.
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-medium tracking-[-0.005em] text-foreground">
            Solo or team
          </span>
          <div className="grid grid-cols-2 gap-2">
            <ToggleCard
              icon={UserIcon}
              title="Solo"
              sub="Just you. One seat, simple defaults, easy to expand later."
              selected={data.teamMode === "solo"}
              onClick={() => set({ teamMode: "solo" })}
            />
            <ToggleCard
              icon={UsersIcon}
              title="Team"
              sub="Up to 5 seats for the alpha. Roles, audit log, shared roster."
              selected={data.teamMode === "team"}
              onClick={() => set({ teamMode: "team" })}
            />
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-md border border-dashed border-[rgba(15,23,42,0.16)] bg-[rgba(15,23,42,0.035)] p-3.5">
          <WorkspaceIcon
            icon={{ kind: "letter", letter: previewLetter, tone: data.iconTone }}
            size={40}
          />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <span className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">
              {data.workspaceName || "Your workspace"}
            </span>
            <span className="font-mono text-[11.5px] text-[rgba(15,23,42,0.55)]">
              tinyops.app/{data.handle || "your-handle"}
            </span>
          </div>
          <span className="self-start rounded-xs bg-[rgba(15,23,42,0.06)] px-1.5 py-0.5 text-[11px] text-[rgba(15,23,42,0.55)]">
            {data.teamMode === "solo" ? "Solo · 1 seat" : "Team · up to 5"}
          </span>
        </div>
      </div>
    </div>
  )
}

/**
 * What is known about the handle, in the same one live region the format rule uses. An
 * unanswered check reads as a hint, not a warning: the flow does not block on it (OBI-9).
 */
function availabilityMessage(availability: WorkspaceHandleAvailability) {
  switch (availability.status) {
    case "checking":
      return "Checking whether that handle is free…"
    case "free":
      return "That handle is free."
    case "taken":
      // The alternative is named here and not only on the button, so that the polite
      // announcement carries it too - otherwise it exists only for people who can see it.
      return availability.suggestion
        ? `That handle is taken. ${availability.suggestion} is free.`
        : "That handle is taken."
    case "unknown":
      return "We could not check whether that handle is free. You can continue."
    case "idle":
      return "Used for shared links and SSO. Lowercase letters, numbers and dashes only."
  }
}

function ToggleCard({
  icon: IconCmp,
  title,
  sub,
  selected,
  onClick,
}: {
  icon: typeof UserIcon
  title: string
  sub: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-md border p-3.5 text-left transition-colors duration-100",
        "border-[rgba(15,23,42,0.12)] bg-card hover:border-[rgba(15,23,42,0.28)]",
        selected &&
          "border-cobalt-500 bg-cobalt-500/[0.04] shadow-[0_0_0_3px_rgba(37,99,235,0.10)] hover:border-cobalt-500"
      )}
    >
      <span className="inline-flex items-center gap-2 text-[14px] font-medium text-foreground">
        <IconCmp className="size-3.5 text-cobalt-700" /> {title}
      </span>
      <span className="mt-1 block text-[12px] leading-[1.45] text-[rgba(15,23,42,0.6)]">
        {sub}
      </span>
    </button>
  )
}
