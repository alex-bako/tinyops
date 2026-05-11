"use client"

import * as React from "react"
import {
  FeatherIcon,
  PlusIcon,
  ScaleIcon,
  ShieldCheckIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"
import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import {
  SegmentedControl,
  type SegmentedOption,
} from "@workspace/ui/components/segmented-control"
import { Switch } from "@workspace/ui/components/switch"

import type {
  AutoSendThreshold,
  SensitivityMode,
  Workspace,
  WorkspaceSensitivity,
} from "@/features/workspaces/types"

const MODES: {
  id: SensitivityMode
  title: string
  sub: string
  icon: LucideIcon
}[] = [
  {
    id: "strict",
    title: "Strict",
    sub: "Manual review required for any flagged context.",
    icon: ShieldCheckIcon,
  },
  {
    id: "balanced",
    title: "Balanced",
    sub: "Auto-personalize low risk; review medium and above.",
    icon: ScaleIcon,
  },
  {
    id: "lenient",
    title: "Lenient",
    sub: "Auto-personalize all; flag high risk only.",
    icon: FeatherIcon,
  },
]

const THRESHOLDS: SegmentedOption<AutoSendThreshold>[] = [
  { value: "low-only", label: "Low only" },
  { value: "low-and-medium", label: "Low + medium" },
  { value: "everything", label: "Everything" },
]

const createSensitivityDraft = (workspace: Workspace): WorkspaceSensitivity =>
  workspace.sensitivity

export function SectionSensitivity({
  workspace,
  onUpdateSensitivity,
}: {
  workspace: Workspace
  onUpdateSensitivity: (patch: Partial<WorkspaceSensitivity>) => void
}) {
  const [draft, setDraft] = React.useState<WorkspaceSensitivity>(() =>
    createSensitivityDraft(workspace)
  )
  const s = draft

  React.useEffect(() => {
    setDraft(workspace.sensitivity)
  }, [workspace.id, workspace.sensitivity])

  const setMode = (mode: SensitivityMode) =>
    setDraft((current) => ({ ...current, mode }))
  const setThreshold = (autoSendThreshold: AutoSendThreshold) =>
    setDraft((current) => ({ ...current, autoSendThreshold }))
  const toggleExclude = () =>
    setDraft((current) => ({
      ...current,
      excludeFromOutbound: !current.excludeFromOutbound,
    }))
  const removeKeyword = (keyword: string) =>
    setDraft((current) => ({
      ...current,
      manualReviewKeywords: current.manualReviewKeywords.filter(
        (k) => k !== keyword
      ),
    }))

  return (
    <div>
      <div className="mb-6">
        <h2 className="mb-1.5 font-sans text-[22px] font-semibold leading-[1.2] tracking-[-0.02em] text-foreground">
          Sensitivity policy
        </h2>
        <p className="m-0 max-w-[64ch] text-[13.5px] leading-[1.55] text-muted-foreground">
          How this workspace handles sensitive content in client memory and
          outbound drafts. This is a workspace-level guarantee; it cannot be
          overridden per-client without an explicit human action.
        </p>
      </div>

      <Form>
        <FormRow
          label="Default mode"
          help="Choose how cautious TinyOps is by default."
        >
          <div className="flex max-w-[520px] flex-col gap-2">
            {MODES.map((m) => {
              const active = s.mode === m.id
              const Icon = m.icon
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  data-state={active ? "on" : "off"}
                  className={cn(
                    "flex items-center gap-3 rounded-md border bg-background p-3 text-left transition-colors duration-(--dur-fast)",
                    active
                      ? "border-cobalt-500 bg-cobalt-500/[0.04] shadow-[0_0_0_3px_rgba(37,99,235,0.10)]"
                      : "border-input hover:bg-[var(--tint-hover)]"
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4",
                      active ? "text-cobalt-500" : "text-muted-foreground"
                    )}
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[14px] font-semibold tracking-[-0.005em] text-foreground">
                      {m.title}
                    </span>
                    <span className="text-[12px] text-muted-foreground">
                      {m.sub}
                    </span>
                  </div>
                  <span
                    aria-hidden
                    className={cn(
                      "size-3.5 shrink-0 rounded-full border-[1.5px]",
                      active
                        ? "border-cobalt-500 bg-cobalt-500 shadow-[inset_0_0_0_3px_var(--popover)]"
                        : "border-input"
                    )}
                  />
                </button>
              )
            })}
          </div>
        </FormRow>

        <FormRow
          label="Auto-send threshold"
          help="Below this risk level, drafts are queued for one-tap approval rather than manual review."
        >
          <SegmentedControl
            value={s.autoSendThreshold}
            onChange={setThreshold}
            options={THRESHOLDS}
          />
        </FormRow>

        <FormRow
          label="Exclude from outbound"
          help="Sensitive context is never quoted in generated drafts, even when the operator approves."
        >
          <div className="flex items-center gap-2.5">
            <Switch
              checked={s.excludeFromOutbound}
              onCheckedChange={toggleExclude}
            />
            <span className="text-[13px] text-foreground">
              {s.excludeFromOutbound ? "Excluded" : "Allowed"}
            </span>
          </div>
        </FormRow>

        <FormRow
          label="Manual-review keywords"
          help="Any client event containing these words is flagged for manual review before drafts are sent."
        >
          <div className="flex flex-wrap items-center gap-1.5">
            {s.manualReviewKeywords.map((k) => (
              <span
                key={k}
                className="inline-flex items-center gap-1 rounded-xs bg-[var(--tint-hover)] px-2 py-1 text-[12px] text-foreground"
              >
                {k}
                <button
                  type="button"
                  onClick={() => removeKeyword(k)}
                  title="Remove"
                  className="inline-flex items-center justify-center text-muted-foreground transition-colors hover:text-coral-700"
                >
                  <XIcon className="size-2.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded-xs border border-dashed border-input px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:border-input hover:bg-[var(--tint-hover)] hover:text-foreground"
            >
              <PlusIcon className="size-2.5" />
              Add keyword
            </button>
          </div>
        </FormRow>
      </Form>

      <div className="mt-7 flex items-center justify-end gap-2 border-t border-border pt-4">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setDraft(workspace.sensitivity)}
        >
          Discard
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={() => onUpdateSensitivity(draft)}
        >
          Save policy
        </Button>
      </div>
    </div>
  )
}
