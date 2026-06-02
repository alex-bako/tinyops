"use client"

import { CheckIcon, CopyIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { cn } from "@workspace/ui/lib/utils"

import { useCopyToClipboard } from "@/hooks/use-copy-to-clipboard"

export function CopyEmailButton({ email }: { email: string }) {
  const { copied, copy } = useCopyToClipboard()

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={!email}
      onClick={() => copy(email)}
      aria-label={copied ? "Email address copied" : "Copy email address"}
    >
      {/* Icon morph: copy grows out, check grows in */}
      <span className="relative inline-flex size-3.5 items-center justify-center">
        <CopyIcon
          className={cn(
            "absolute transition-[opacity,transform] duration-(--dur-base) ease-(--ease-out)",
            copied ? "scale-50 opacity-0" : "scale-100 opacity-100"
          )}
        />
        <CheckIcon
          className={cn(
            "absolute text-citron-700 transition-[opacity,transform] duration-(--dur-base) ease-(--ease-out)",
            copied ? "scale-100 opacity-100" : "scale-50 opacity-0"
          )}
        />
      </span>
      {/* Labels share one grid cell -> width = max(both), no neighbor shift */}
      <span className="grid">
        <span
          className={cn(
            "col-start-1 row-start-1 transition-opacity duration-(--dur-base) ease-(--ease-out)",
            copied ? "opacity-0" : "opacity-100"
          )}
        >
          Copy email
        </span>
        <span
          aria-hidden={!copied}
          className={cn(
            "col-start-1 row-start-1 transition-opacity duration-(--dur-base) ease-(--ease-out)",
            copied ? "opacity-100" : "opacity-0"
          )}
        >
          Copied!
        </span>
      </span>
    </Button>
  )
}
