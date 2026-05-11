import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import type { StepProps } from "../types"

const inputClass =
  "h-9 rounded-sm border-[rgba(15,23,42,0.16)] bg-card px-3 text-[14px] text-foreground placeholder:text-[rgba(15,23,42,0.3)] focus-visible:border-cobalt-500 focus-visible:ring-cobalt-500/[0.12]"

export function StepName({ data, set }: StepProps) {
  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-foreground">
          Welcome. Let&rsquo;s{" "}
          <em className="font-serif font-normal italic tracking-[-0.005em] text-cobalt-700">
            set you up.
          </em>
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          Two minutes - you can change any of this later.
        </p>
      </header>

      <div className="flex flex-col gap-[18px]">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="ob-first-name"
              className="text-[13px] font-medium tracking-[-0.005em] text-foreground"
            >
              First name
            </Label>
            <Input
              id="ob-first-name"
              value={data.firstName}
              onChange={(e) => set({ firstName: e.target.value })}
              placeholder="Jamie"
              className={inputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label
              htmlFor="ob-last-name"
              className="text-[13px] font-medium tracking-[-0.005em] text-foreground"
            >
              Last name
            </Label>
            <Input
              id="ob-last-name"
              value={data.lastName}
              onChange={(e) => set({ lastName: e.target.value })}
              placeholder="Park"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label
            htmlFor="ob-sender"
            className="text-[13px] font-medium tracking-[-0.005em] text-foreground"
          >
            How clients know you
          </Label>
          <Input
            id="ob-sender"
            value={data.senderName}
            onChange={(e) => set({ senderName: e.target.value })}
            placeholder="Jamie at Park Therapy"
            className={inputClass}
          />
          <span className="text-[12px] leading-[1.5] text-[rgba(15,23,42,0.55)]">
            Used as the sender name on every draft. Drafts are reviewed before
            they go out.
          </span>
        </div>
      </div>
    </div>
  )
}
