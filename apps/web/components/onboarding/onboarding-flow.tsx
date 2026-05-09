"use client"

import * as React from "react"
import { ArrowLeftIcon, ArrowRightIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { WorkspaceIcon } from "@workspace/ui/components/workspace-icon"

import { completeOnboarding } from "@/app/onboarding/actions"
import type { OnboardingCommand } from "@/features/onboarding/application"
import { DEFAULT_SIGNED_IN_PATH } from "@/lib/auth/route-policy"

import { INITIAL_DATA, QUOTES, VERTICALS, buildSteps, slugify } from "./data"
import { Quote } from "./quote"
import { Stepper } from "./stepper"
import { StepDone } from "./steps/step-done"
import { StepInvite } from "./steps/step-invite"
import { StepName } from "./steps/step-name"
import { StepSensitivity } from "./steps/step-sensitivity"
import { StepSource } from "./steps/step-source"
import { StepVertical } from "./steps/step-vertical"
import { StepWorkspace } from "./steps/step-workspace"
import type { OnboardingData, SkippedMap, StepId } from "./types"

export function OnboardingFlow() {
  const router = useRouter()
  const [stepIdx, setStepIdx] = React.useState(0)
  const [skipped, setSkipped] = React.useState<SkippedMap>({})
  const [data, setData] = React.useState<OnboardingData>(INITIAL_DATA)
  const [pending, setPending] = React.useState(false)
  const [finishError, setFinishError] = React.useState<string | null>(null)
  const [canSkipSourceAfterError, setCanSkipSourceAfterError] =
    React.useState(false)

  const set = React.useCallback((patch: Partial<OnboardingData>) => {
    setData((d) => ({ ...d, ...patch }))
  }, [])

  const steps = React.useMemo(() => buildSteps(data), [data])
  const safeIdx = Math.min(stepIdx, steps.length - 1)
  const step = steps[safeIdx]!
  const stepId: StepId = step.id

  React.useEffect(() => {
    if (data.firstName && !data.senderName) {
      const next = `${data.firstName} ${data.lastName}`.trim()
      if (next) setData((d) => ({ ...d, senderName: next }))
    }
  }, [data.firstName, data.lastName, data.senderName])

  React.useEffect(() => {
    if (data.workspaceName && !data.handle) {
      setData((d) => ({ ...d, handle: slugify(d.workspaceName) }))
    }
    if (data.workspaceName && !data.iconLetter) {
      setData((d) => ({
        ...d,
        iconLetter: d.workspaceName[0]!.toUpperCase(),
      }))
    }
  }, [data.workspaceName, data.handle, data.iconLetter])

  React.useEffect(() => {
    if (!data.vertical) return
    const v = VERTICALS.find((x) => x.id === data.vertical)
    if (v) setData((d) => ({ ...d, sensitivity: v.sensitivity }))
  }, [data.vertical])

  const canContinue = (() => {
    switch (stepId) {
      case "name":
        return data.firstName.trim().length > 0
      case "vertical":
        return !!data.vertical
      case "workspace":
        return (
          data.workspaceName.trim().length > 0 && data.handle.trim().length > 0
        )
      case "sensitivity":
        return !!data.sensitivity
      case "source":
        if (!data.source) return false
        if (data.source !== "imap") return true
        return (
          data.imapHost.trim().length > 0 &&
          data.imapPort.trim().length > 0 &&
          data.imapUsername.trim().length > 0 &&
          data.imapPassword.trim().length > 0
        )
      case "invite":
        return true
      case "done":
        return true
    }
  })()

  const skippable = stepId === "source" || stepId === "invite"

  const goNext = () => {
    if (safeIdx < steps.length - 1) setStepIdx(safeIdx + 1)
  }
  const goSkip = () => {
    if (stepId === "source") {
      set({ source: "skip" })
    }
    setSkipped((s) => ({ ...s, [stepId]: true }))
    goNext()
  }
  const goBack = () => {
    if (safeIdx > 0) setStepIdx(safeIdx - 1)
  }

  const submit = async (sourceOverride?: OnboardingCommand["source"]) => {
    setPending(true)
    setFinishError(null)
    setCanSkipSourceAfterError(false)
    try {
      const result = await completeOnboarding(buildCommand(data, sourceOverride))
      if (result.status === "completed") {
        router.replace(DEFAULT_SIGNED_IN_PATH)
        return
      }
      if (result.status === "source_error") {
        setFinishError("source_connection_failed")
        setCanSkipSourceAfterError(result.fallback === "skip_source")
        return
      }
      setFinishError(result.error)
    } finally {
      setPending(false)
    }
  }

  const stepBody = (() => {
    switch (stepId) {
      case "name":
        return <StepName data={data} set={set} />
      case "vertical":
        return <StepVertical data={data} set={set} />
      case "workspace":
        return <StepWorkspace data={data} set={set} />
      case "sensitivity":
        return <StepSensitivity data={data} set={set} />
      case "source":
        return <StepSource data={data} set={set} />
      case "invite":
        return <StepInvite data={data} set={set} />
      case "done":
        return <StepDone data={data} skipped={skipped} />
    }
  })()

  const quote = QUOTES[stepId]

  return (
    <div className="grid min-h-screen grid-cols-1 bg-background md:grid-cols-[minmax(360px,1fr)_minmax(560px,1.2fr)]">
      <aside className="relative hidden flex-col gap-8 overflow-hidden border-r border-[rgba(15,23,42,0.09)] bg-[#F5F3EC] px-10 py-8 md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: `radial-gradient(circle at 14% 88%, rgba(37,99,235,0.08) 0 4px, transparent 5px), radial-gradient(circle at 86% 12%, rgba(190,242,100,0.45) 0 6px, transparent 7px)`,
          }}
        />

        <div className="relative z-10 inline-flex items-center gap-2.5 text-[16px] font-semibold tracking-[-0.02em] text-foreground">
          <WorkspaceIcon icon={{ kind: "mark" }} size={26} />
          TinyOps
        </div>

        <Stepper steps={steps} current={safeIdx} skipped={skipped} />

        <Quote eyebrow={quote.attr}>{quote.text}</Quote>
      </aside>

      <main className="relative flex flex-col overflow-y-auto bg-card">
        <div className="flex items-center gap-3 px-10 pt-[18px]">
          <button
            type="button"
            onClick={goBack}
            disabled={safeIdx === 0}
            className="inline-flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[13px] text-[rgba(15,23,42,0.55)] hover:bg-[rgba(15,23,42,0.05)] hover:text-foreground disabled:invisible"
          >
            <ArrowLeftIcon className="size-3.5" /> Back
          </button>
          <span className="flex-1" />
          <span className="font-mono text-[11.5px] tracking-[0.04em] text-[rgba(15,23,42,0.5)]">
            STEP {String(safeIdx + 1).padStart(2, "0")} /{" "}
            {String(steps.length).padStart(2, "0")}
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center px-10 py-6">
          <div
            key={stepId}
            style={{ animation: "ob-step-fade 220ms var(--ease-out)" }}
            className="w-full"
          >
            <div className="mx-auto flex w-full max-w-[620px] justify-center">
              {stepBody}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 border-t border-[rgba(15,23,42,0.07)] px-10 pb-6 pt-4">
          {stepId === "done" ? (
            <>
              {finishError && (
                <div
                  role="alert"
                  aria-label="source connection failed"
                  className="mr-auto flex max-w-[440px] items-center gap-2 rounded-sm border border-coral-500/25 bg-coral-500/[0.07] px-3 py-2 text-[12.5px] leading-[1.4] text-coral-700"
                >
                  <span className="min-w-0 flex-1">
                    {finishError === "source_connection_failed"
                      ? "We could not verify that source. Finish without it and retry from Sources."
                      : "Onboarding could not be completed. Check the fields and try again."}
                  </span>
                  {canSkipSourceAfterError && (
                    <button
                      type="button"
                      onClick={() => void submit({ type: "skip" })}
                      className="shrink-0 rounded-xs bg-card px-2 py-1 font-medium text-foreground hover:bg-white"
                    >
                      Skip source and finish
                    </button>
                  )}
                </div>
              )}
              <span className="flex-1" />
              <Button
                variant="primary"
                size="lg"
                onClick={() => void submit()}
                disabled={pending}
              >
                {pending ? "Opening…" : "Open TinyOps"}
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1" />
              {skippable && (
                <button
                  type="button"
                  onClick={goSkip}
                  className="rounded-sm px-2.5 py-2 text-[13px] text-[rgba(15,23,42,0.55)] hover:bg-[rgba(15,23,42,0.05)] hover:text-foreground"
                >
                  Skip for now
                </button>
              )}
              <Button
                variant="primary"
                size="lg"
                onClick={goNext}
                disabled={!canContinue}
              >
                Continue
                <ArrowRightIcon className="size-3.5" />
              </Button>
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function buildCommand(
  data: OnboardingData,
  sourceOverride?: OnboardingCommand["source"]
): OnboardingCommand {
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    senderName: data.senderName.trim(),
    workspaceName: data.workspaceName.trim(),
    workspaceHandle: data.handle.trim(),
    iconLetter: (
      data.iconLetter ||
      data.workspaceName.trim().at(0) ||
      "T"
    ).toUpperCase(),
    iconTone: data.iconTone,
    vertical: data.vertical ?? "other",
    sensitivity: data.sensitivity,
    source: sourceOverride ?? sourceCommand(data),
    invites: data.invites
      .map((invite) => ({
        email: invite.email.trim(),
        role: invite.role,
      }))
      .filter((invite) => invite.email.length > 0),
  }
}

function sourceCommand(data: OnboardingData): OnboardingCommand["source"] {
  switch (data.source) {
    case "imap":
      return {
        type: "imap",
        host: data.imapHost,
        port: data.imapPort,
        encryption: data.imapEncryption,
        username: data.imapUsername,
        password: data.imapPassword,
        historyWindow: data.imapHistoryWindow,
        watchedFolders: ["INBOX"],
        skipSenders: [],
      }
    case "csv":
      return { type: "csv" }
    case "forms":
      return { type: "forms" }
    case "skip":
    default:
      return { type: "skip" }
  }
}
