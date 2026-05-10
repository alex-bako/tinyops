import { CheckCircle2Icon, CircleDashedIcon, XCircleIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import { DsSection, DsSectionHead } from "./ds-section"
import type { SourceSyncAttempt } from "../_view-model"

const ATTEMPT_TIME_FORMATTER = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
  timeZoneName: "short",
})

function SyncAttemptsBlock({ attempts }: { attempts: SourceSyncAttempt[] }) {
  if (attempts.length === 0) return null

  return (
    <DsSection>
      <DsSectionHead title="Recent sync attempts" />
      <div className="flex flex-col">
        {attempts.map((attempt) => (
          <div
            key={`${attempt.startedAt}-${attempt.trigger}`}
            className="grid grid-cols-[minmax(0,1fr)_88px] gap-3 border-b border-border py-2.5 text-[13px] last:border-b-0 sm:grid-cols-[150px_minmax(0,1fr)_88px]"
          >
            <time
              dateTime={attempt.startedAt}
              className="hidden pt-px font-mono text-[11.5px] text-muted-foreground sm:block"
            >
              {formatAttemptTime(attempt.startedAt)}
            </time>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-foreground">
                <StatusIcon status={attempt.status} />
                <span>{attempt.label}</span>
              </div>
              {attempt.detail ? (
                <p className="m-0 mt-1 truncate text-[12.5px] text-muted-foreground">
                  {attempt.detail}
                </p>
              ) : null}
            </div>
            <span className="pt-px text-right font-mono text-[11.5px] uppercase text-muted-foreground">
              {attempt.trigger}
            </span>
          </div>
        ))}
      </div>
    </DsSection>
  )
}

function formatAttemptTime(value: string) {
  return ATTEMPT_TIME_FORMATTER.format(new Date(value))
}

function StatusIcon({ status }: { status: SourceSyncAttempt["status"] }) {
  const className = cn(
    "size-3.5",
    status === "succeeded" && "text-mint-700",
    status === "failed" && "text-coral-700",
    status === "running" && "text-cobalt-700"
  )

  if (status === "succeeded") return <CheckCircle2Icon className={className} />
  if (status === "failed") return <XCircleIcon className={className} />
  return <CircleDashedIcon className={className} />
}

export { SyncAttemptsBlock }
