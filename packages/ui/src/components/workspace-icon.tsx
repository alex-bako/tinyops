import * as React from "react"

import { cn } from "@workspace/ui/lib/utils"
import type { AvatarTone } from "@workspace/ui/components/tonal-avatar"

type WorkspaceIconKind =
  | { kind: "mark" }
  | { kind: "letter"; letter: string; tone: AvatarTone }

const letterToneClasses: Record<AvatarTone, string> = {
  cobalt: "bg-cobalt-500 text-white",
  citron: "bg-citron-500 text-slate-900",
  mint: "bg-mint-500 text-white",
  coral: "bg-coral-500 text-white",
  slate: "bg-slate-700 text-white",
}

function radiusFor(size: number) {
  if (size <= 22) return "rounded-[6px]"
  if (size <= 32) return "rounded-[7px]"
  return "rounded-[10px]"
}

function WorkspaceIcon({
  icon,
  size = 22,
  className,
}: {
  icon: WorkspaceIconKind
  size?: number
  className?: string
}) {
  const sizeStyle = { width: size, height: size }

  if (icon.kind === "mark") {
    return (
      <span
        data-slot="workspace-icon"
        data-kind="mark"
        className={cn(
          "inline-flex shrink-0 items-center justify-center overflow-hidden",
          radiusFor(size),
          className
        )}
        style={sizeStyle}
      >
        <svg
          viewBox="0 0 44 44"
          width={size}
          height={size}
          fill="none"
          aria-hidden
          className="block size-full"
        >
          <rect x="2" y="2" width="40" height="40" rx="11" fill="#2563EB" />
          <path
            d="M11 22 H30"
            stroke="#82A3FF"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="11" cy="22" r="2.4" fill="#DCE6FF" />
          <circle cx="20.5" cy="22" r="2.4" fill="#DCE6FF" />
          <circle cx="32" cy="22" r="5.5" fill="#BEF264" />
        </svg>
      </span>
    )
  }

  return (
    <span
      data-slot="workspace-icon"
      data-kind="letter"
      data-tone={icon.tone}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-sans font-semibold tracking-[-0.01em]",
        radiusFor(size),
        letterToneClasses[icon.tone],
        className
      )}
      style={{ ...sizeStyle, fontSize: Math.round(size * 0.5) }}
    >
      {icon.letter}
    </span>
  )
}

export { WorkspaceIcon }
export type { WorkspaceIconKind }
