import { CheckIcon, MinusIcon } from "lucide-react"

import { cn } from "@workspace/ui/lib/utils"

import type { SkippedMap, Step } from "./types"

export function Stepper({
  steps,
  current,
  skipped,
}: {
  steps: Step[]
  current: number
  skipped: SkippedMap
}) {
  return (
    <ol className="relative z-10 mt-1 flex flex-col gap-0.5">
      {steps.map((step, idx) => {
        const isDone = idx < current
        const isCurrent = idx === current
        const wasSkipped = !!skipped[step.id]
        const isLast = idx === steps.length - 1

        return (
          <li
            key={step.id}
            className="relative grid grid-cols-[22px_1fr] items-center gap-3 rounded-sm px-1.5 py-2"
          >
            <span
              className={cn(
                "inline-flex h-[22px] w-[22px] items-center justify-center rounded-full border font-mono text-[11px] font-medium transition-all duration-150",
                "border-[rgba(15,23,42,0.20)] bg-transparent text-[rgba(15,23,42,0.55)]",
                isDone && "border-cobalt-500 bg-cobalt-500 text-white",
                isCurrent &&
                  "border-cobalt-500 bg-white text-cobalt-700 shadow-[0_0_0_4px_rgba(37,99,235,0.12)]"
              )}
              aria-current={isCurrent ? "step" : undefined}
            >
              {isDone ? (
                wasSkipped ? (
                  <MinusIcon className="size-3" />
                ) : (
                  <CheckIcon className="size-3" />
                )
              ) : (
                idx + 1
              )}
            </span>
            <span
              className={cn(
                "text-[13px] tracking-[-0.005em] text-[rgba(15,23,42,0.55)]",
                (isCurrent || isDone) && "font-medium text-foreground",
                wasSkipped &&
                  "line-through decoration-[rgba(15,23,42,0.3)]"
              )}
            >
              {step.label}
            </span>
            {!isLast && (
              <span
                aria-hidden
                className="absolute left-[16px] top-[30px] h-4 w-px bg-[rgba(15,23,42,0.16)]"
              />
            )}
          </li>
        )
      })}
    </ol>
  )
}
