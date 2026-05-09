import type { ReactNode } from "react"

export function Quote({
  eyebrow,
  children,
}: {
  eyebrow: string
  children: ReactNode
}) {
  return (
    <div className="relative z-10 mt-auto border-t border-[rgba(15,23,42,0.09)] pt-8">
      <div className="mb-2.5 font-mono text-[11px] uppercase tracking-[0.08em] text-[rgba(15,23,42,0.45)]">
        {eyebrow}
      </div>
      <p className="m-0 max-w-[24ch] font-serif text-[26px] font-normal italic leading-[1.25] tracking-[-0.01em] text-foreground">
        {children}
      </p>
    </div>
  )
}
