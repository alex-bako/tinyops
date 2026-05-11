import { ChoiceCard } from "../choice-card"
import { SENSITIVITIES, VERTICALS } from "../data"
import type { StepProps } from "../types"

export function StepSensitivity({ data, set }: StepProps) {
  const vertical = VERTICALS.find((v) => v.id === data.vertical)
  const recommendedId = vertical?.sensitivity ?? null
  const recommended = SENSITIVITIES.find((s) => s.id === recommendedId)

  return (
    <div className="flex w-full max-w-[620px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
          How careful should TinyOps be?
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          This is a workspace-level guarantee - it can&rsquo;t be overridden
          per-client without an explicit human action.
          {recommended && (
            <>
              {" "}
              Based on your work, we suggest{" "}
              <strong className="font-semibold text-foreground">
                {recommended.title}
              </strong>
              .
            </>
          )}
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {SENSITIVITIES.map((s) => (
          <ChoiceCard
            key={s.id}
            icon={s.icon}
            title={s.title}
            sub={s.blurb}
            selected={data.sensitivity === s.id}
            onClick={() => set({ sensitivity: s.id })}
            recommended={recommendedId === s.id}
          />
        ))}
      </div>
    </div>
  )
}
