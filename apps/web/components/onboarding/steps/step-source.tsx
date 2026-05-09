import type { ReactNode } from "react"

import { Input } from "@workspace/ui/components/input"
import { Label } from "@workspace/ui/components/label"

import { ChoiceCard } from "../choice-card"
import { SOURCES } from "../data"
import type { StepProps } from "../types"

const inputClass =
  "h-9 rounded-sm border-[rgba(15,23,42,0.16)] bg-card px-3 text-[14px] text-foreground placeholder:text-[rgba(15,23,42,0.3)] focus-visible:border-cobalt-500 focus-visible:ring-cobalt-500/[0.12]"

export function StepSource({ data, set }: StepProps) {
  return (
    <div className="flex w-full max-w-[620px] flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="m-0 text-[32px] font-bold leading-[1.1] tracking-[-0.025em] text-foreground">
          Connect a data source
        </h1>
        <p className="m-0 max-w-[56ch] text-[15px] leading-[1.55] text-[rgba(15,23,42,0.65)]">
          Or skip — you can connect anytime from Sources. Without sources, your
          workspace is empty.
        </p>
      </header>

      <div className="flex flex-col gap-2">
        {SOURCES.map((s) => (
          <ChoiceCard
            key={s.id}
            icon={s.icon}
            title={s.label}
            sub={s.sub}
            badge={s.chip}
            selected={data.source === s.id}
            onClick={() =>
              set({
                source: s.id,
              })
            }
          />
        ))}
      </div>

      {data.source === "imap" && (
        <div className="grid grid-cols-1 gap-3 rounded-md border border-[rgba(15,23,42,0.12)] bg-[rgba(15,23,42,0.025)] p-3.5 sm:grid-cols-2">
          <Field label="IMAP host" htmlFor="ob-imap-host">
            <Input
              id="ob-imap-host"
              value={data.imapHost}
              onChange={(event) => set({ imapHost: event.target.value })}
              placeholder="imap.example.com"
              className={inputClass}
            />
          </Field>
          <Field label="Port" htmlFor="ob-imap-port">
            <Input
              id="ob-imap-port"
              inputMode="numeric"
              value={data.imapPort}
              onChange={(event) => set({ imapPort: event.target.value })}
              className={inputClass}
            />
          </Field>
          <Field label="Security" htmlFor="ob-imap-encryption">
            <select
              id="ob-imap-encryption"
              value={data.imapEncryption}
              onChange={(event) =>
                set({
                  imapEncryption: event.target
                    .value as StepProps["data"]["imapEncryption"],
                })
              }
              className={inputClass}
            >
              <option value="ssl">SSL</option>
              <option value="starttls">STARTTLS</option>
              <option value="none">None</option>
            </select>
          </Field>
          <Field label="History" htmlFor="ob-imap-history">
            <select
              id="ob-imap-history"
              value={data.imapHistoryWindow}
              onChange={(event) =>
                set({
                  imapHistoryWindow: event.target
                    .value as StepProps["data"]["imapHistoryWindow"],
                })
              }
              className={inputClass}
            >
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
              <option value="12mo">12 months</option>
              <option value="all">All mail</option>
            </select>
          </Field>
          <Field label="IMAP username" htmlFor="ob-imap-username">
            <Input
              id="ob-imap-username"
              value={data.imapUsername}
              onChange={(event) => set({ imapUsername: event.target.value })}
              placeholder="you@example.com"
              className={inputClass}
            />
          </Field>
          <Field label="IMAP password" htmlFor="ob-imap-password">
            <Input
              id="ob-imap-password"
              type="password"
              value={data.imapPassword}
              onChange={(event) => set({ imapPassword: event.target.value })}
              className={inputClass}
            />
          </Field>
        </div>
      )}
    </div>
  )
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string
  htmlFor: string
  children: ReactNode
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label
        htmlFor={htmlFor}
        className="text-[13px] font-medium tracking-[-0.005em] text-foreground"
      >
        {label}
      </Label>
      {children}
    </div>
  )
}
