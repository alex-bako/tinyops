import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@workspace/ui/lib/utils"

// Mono, uppercase "AI · grounded"-style stamp. Factored from the callout stamp
// so it can be used anywhere (e.g. a section header), not only inside a Callout.
const aiStampVariants = cva(
  "inline-flex items-center gap-1.5 font-mono text-[11px] font-medium uppercase tracking-[0.06em]",
  {
    variants: {
      tone: {
        brand: "text-cobalt-700",
        sensitive: "text-coral-700",
        neutral: "text-muted-foreground",
      },
    },
    defaultVariants: {
      tone: "brand",
    },
  }
)

function AiStamp({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof aiStampVariants>) {
  return (
    <span
      data-slot="ai-stamp"
      data-tone={tone ?? "brand"}
      className={cn(aiStampVariants({ tone }), className)}
      {...props}
    />
  )
}

export { AiStamp }
