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

import type {
  ImapMessageFilterField,
  ImapMessageFilterOperator,
  ImapMessageFilterRule,
} from "@/features/data-sources/types"

const FIELDS: Array<{ value: ImapMessageFilterField; label: string }> = [
  { value: "from", label: "From" },
  { value: "to", label: "To" },
  { value: "subject", label: "Subject" },
  { value: "body", label: "Body" },
]

const OPERATORS: Array<{ value: ImapMessageFilterOperator; label: string }> = [
  { value: "is", label: "is" },
  { value: "is_not", label: "is not" },
  { value: "contains", label: "contains" },
  { value: "does_not_contain", label: "does not contain" },
]

function RuleRow({
  rule,
  onChange,
  onRemove,
}: {
  rule: ImapMessageFilterRule
  onChange: (rule: ImapMessageFilterRule) => void
  onRemove: () => void
}) {
  return (
    <div className="grid grid-cols-[110px_150px_minmax(0,1fr)_28px] items-center gap-1.5">
      <Select
        value={rule.field}
        onValueChange={(field) =>
          onChange({ ...rule, field: field as ImapMessageFilterField })
        }
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {FIELDS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={rule.operator}
        onValueChange={(operator) =>
          onChange({
            ...rule,
            operator: operator as ImapMessageFilterOperator,
          })
        }
      >
        <SelectTrigger size="sm" className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {OPERATORS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Input
        value={rule.value}
        onChange={(event) => onChange({ ...rule, value: event.target.value })}
        className="font-mono text-[12.5px]"
      />

      <button
        type="button"
        aria-label="Remove rule"
        onClick={onRemove}
        className="inline-flex size-6 items-center justify-center rounded-[3px] text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
      >
        <XIcon className="size-3" />
      </button>
    </div>
  )
}

export { RuleRow }
