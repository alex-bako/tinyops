import { ChoiceCard } from "../choice-card"
import { VERTICALS } from "../data"
import type { StepProps } from "../types"

export function StepVertical({ data, set }: StepProps) {
  return (
    <div className="flex w-full max-w-[620px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
          What kind of work do you do?
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          We use this to set safe defaults for sensitivity and content. Nothing
          is locked in.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {VERTICALS.map((v) => (
          <ChoiceCard
            key={v.id}
            icon={v.icon}
            title={v.label}
            sub={v.sub}
            selected={data.vertical === v.id}
            onClick={() => set({ vertical: v.id })}
          />
        ))}
      </div>
    </div>
  )
}
