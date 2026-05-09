"use client"

import * as React from "react"
import { XIcon } from "lucide-react"

import { Input } from "@workspace/ui/components/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select"

const FIELDS = ["From", "To", "Subject", "Body"] as const
const OPERATORS = ["is", "is not", "contains", "does not contain"] as const

function RuleRow({
  field,
  op,
  value,
}: {
  field: (typeof FIELDS)[number]
  op: (typeof OPERATORS)[number]
  value: string
}) {
  const [fieldVal, setFieldVal] = React.useState<string>(field)
  const [opVal, setOpVal] = React.useState<string>(op)
  const [textVal, setTextVal] = React.useState<string>(value)

  return (
    <div className="grid grid-cols-[110px_140px_minmax(0,1fr)_28px] items-center gap-1.5">
      <Select value={fieldVal} onValueChange={setFieldVal}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELDS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={opVal} onValueChange={setOpVal}>
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={textVal}
        onChange={(event) => setTextVal(event.target.value)}
        className="font-mono text-[12.5px]"
      />

      <button
        type="button"
        aria-label="Remove rule"
        className="inline-flex size-6 items-center justify-center rounded-[3px] text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  )
}

export { RuleRow }
