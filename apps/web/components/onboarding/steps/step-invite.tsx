import { PlusIcon, XIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

import type { Invite, InviteRole, StepProps } from "../types"

const inputClass =
  "h-9 rounded-sm border-[rgba(15,23,42,0.16)] bg-card px-3 text-[14px] text-foreground placeholder:text-[rgba(15,23,42,0.3)] focus-visible:border-cobalt-500 focus-visible:ring-cobalt-500/[0.12]"

const ROLES: ReadonlyArray<{ value: InviteRole; label: string }> = [
  { value: "admin", label: "Admin" },
  { value: "operator", label: "Operator" },
  { value: "reviewer", label: "Reviewer" },
  { value: "viewer", label: "Viewer" },
]

export function StepInvite({ data, set }: StepProps) {
  const update = (i: number, patch: Partial<Invite>) => {
    const next = data.invites.map((row, j) =>
      j === i ? { ...row, ...patch } : row
    )
    set({ invites: next })
  }
  const remove = (i: number) =>
    set({ invites: data.invites.filter((_, j) => j !== i) })
  const add = () =>
    set({
      invites: [...data.invites, { email: "", role: "operator" }],
    })

  return (
    <div className="flex w-full max-w-[520px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-foreground">
          Invite your team
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          They&rsquo;ll get an email with a link. You can always invite more from
          workspace settings.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {data.invites.map((inv, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_140px_28px] items-center gap-2"
          >
            <Input
              type="email"
              placeholder="name@email.com"
              value={inv.email}
              onChange={(e) => update(i, { email: e.target.value })}
              className={inputClass}
            />
            <Select
              value={inv.role}
              onValueChange={(value) =>
                update(i, { role: value as InviteRole })
              }
            >
              <SelectTrigger className="h-9 w-full rounded-sm border-[rgba(15,23,42,0.16)] bg-card px-3 text-[13px] text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => remove(i)}
              title="Remove row"
              className="inline-flex h-7 w-7 items-center justify-center rounded-xs text-[rgba(15,23,42,0.5)] hover:bg-[rgba(15,23,42,0.05)] hover:text-foreground"
            >
              <XIcon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={add}
        className="inline-flex w-fit items-center gap-1.5 rounded-xs px-1.5 py-1 text-[13px] text-cobalt-700 hover:bg-cobalt-500/[0.06]"
      >
        <PlusIcon className="size-3.5" /> Add another
      </button>

      <p className="m-0 text-[12px] leading-[1.5] text-[rgba(15,23,42,0.55)]">
        New members default to{" "}
        <strong className="font-semibold text-foreground">Operator</strong> —
        read clients, draft, and send. Approving sensitive drafts requires
        Admin.
      </p>
    </div>
  )
}
