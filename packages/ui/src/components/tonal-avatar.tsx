import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

const TONES = ["cobalt", "citron", "coral", "mint", "slate"] as const
type Tone = (typeof TONES)[number]

const toneClasses: Record<Tone, string> = {
  cobalt: "bg-cobalt-500 text-white",
  citron: "bg-citron-500 text-slate-900",
  coral: "bg-coral-500 text-white",
  mint: "bg-mint-500 text-white",
  slate: "bg-slate-700 text-white",
}

const avatarVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center font-sans font-semibold tracking-normal",
  {
    variants: {
      size: {
        xs: "size-[18px] rounded-xs text-[9px]",
        sm: "size-[22px] rounded-xs text-[10px]",
        md: "size-[28px] rounded-sm text-[11.5px]",
        lg: "size-[56px] rounded-md text-[22px]",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
)

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return "?"
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

function toneFor(name: string): Tone {
  const initials = initialsOf(name)
  const code =
    (initials.charCodeAt(0) || 65) + (initials.charCodeAt(1) || 0)
  return TONES[code % TONES.length]!
}

/**
 * Deterministic monogram avatar — Notion-style square-with-soft-corners.
 * Picks a tone from the brand palette using a stable hash of the name,
 * so "Anna Smith" always gets the same color.
 */
function TonalAvatar({
  className,
  size,
  name,
  tone,
  ...props
}: React.ComponentProps<"span"> &
  VariantProps<typeof avatarVariants> & {
    name: string
    tone?: Tone
  }) {
  const resolvedTone = tone ?? toneFor(name)
  return (
    <span
      data-slot="tonal-avatar"
      data-tone={resolvedTone}
      className={cn(
        avatarVariants({ size }),
        toneClasses[resolvedTone],
        className
      )}
      aria-label={name}
      {...props}
    >
      {initialsOf(name)}
    </span>
  )
}

export { TonalAvatar, avatarVariants as tonalAvatarVariants, TONES as AVATAR_TONES }
export type { Tone as AvatarTone }
