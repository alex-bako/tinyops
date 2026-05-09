"use client"

import * as React from "react"
import { PlusIcon, RefreshCwIcon, SaveIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Textarea } from "@workspace/ui/components/textarea"

import {
  refreshImapFoldersAction,
  updateImapImportSettingsAction,
} from "@/features/data-sources/actions"
import type {
  ImapMessageFilterRule,
  ImapMessageFilters,
} from "@/features/data-sources/types"
import type { DataSource } from "@/lib/sources"

import { ChipPicker } from "../chip-picker"
import { DsSection, DsSectionHead } from "../ds-section"
import { RuleRow } from "../rule-row"
import { SegmentedControl } from "../segmented-control"

const FOLDER_COUNT_FORMATTER = new Intl.NumberFormat("en-US")

type ImapConfigFormState = {
  folders: string[]
  historyWindow: NonNullable<DataSource["imap"]>["historyWindow"]
  skipSenders: string
  messageFilters: ImapMessageFilters
}

function ImapConfig({ source }: { source: DataSource }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [refreshing, startRefreshTransition] = React.useTransition()
  const [form, setForm] = React.useState(() => imapConfigFormState(source))

  if (!source.connected || !source.sourceRowId || !source.imap) return null

  const folderItems = uniqueFolderItems([
    ...source.imap.availableFolders.map((folder) => ({
      id: folder.path,
      label: folder.path,
      meta: folder.messages === null ? undefined : formatCount(folder.messages),
    })),
    ...form.folders.map((folder) => ({ id: folder, label: folder })),
  ])

  const save = () => {
    startTransition(async () => {
      const result = await updateImapImportSettingsAction(source.sourceRowId!, {
        historyWindow: form.historyWindow,
        watchedFolders: form.folders,
        skipSenders: form.skipSenders.split("\n").flatMap((sender) => {
          const value = sender.trim()
          return value ? [value] : []
        }),
        messageFilters: {
          mode: "and",
          rules: form.messageFilters.rules.flatMap((rule) => {
            const value = rule.value.trim()
            return value ? [{ ...rule, value }] : []
          }),
        },
      })
      if (!result.error) refresh()
    })
  }

  const refreshFolders = () => {
    startRefreshTransition(async () => {
      const result = await refreshImapFoldersAction(source.sourceRowId!)
      if (!result.error) refresh()
    })
  }

  const updateRule = (rule: ImapMessageFilterRule) => {
    setForm((current) => ({
      ...current,
      messageFilters: {
        mode: "and",
        rules: current.messageFilters.rules.map((candidate) =>
          candidate.id === rule.id ? rule : candidate
        ),
      },
    }))
  }

  const removeRule = (ruleId: string) => {
    setForm((current) => ({
      ...current,
      messageFilters: {
        mode: "and",
        rules: current.messageFilters.rules.filter((rule) => rule.id !== ruleId),
      },
    }))
  }

  const addRule = () => {
    setForm((current) => ({
      ...current,
      messageFilters: {
        mode: "and",
        rules: [
          ...current.messageFilters.rules,
          {
            id: `rule_${Date.now()}`,
            field: "from",
            operator: "contains",
            value: "",
          },
        ],
      },
    }))
  }

  return (
    <DsSection>
      <DsSectionHead
        title="Folders & filters"
        hint="Only messages matching these rules are imported."
      />
      <Form>
        <FormRow label="Folders to watch">
          <div className="flex flex-col gap-2">
            <ChipPicker
              items={folderItems}
              defaultValue={form.folders}
              placeholder="Add folder"
              onChange={(folders) =>
                setForm((current) => ({ ...current, folders }))
              }
              mono
            />
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              disabled={refreshing}
              onClick={refreshFolders}
              className="self-start"
            >
              <RefreshCwIcon />
              Refresh folders
            </Button>
          </div>
        </FormRow>
        <FormRow label="History window">
          <SegmentedControl
            ariaLabel="History window"
            value={form.historyWindow}
            onChange={(next) =>
              setForm((current) => ({
                ...current,
                historyWindow: next as ImapConfigFormState["historyWindow"],
              }))
            }
            options={[
              { value: "30d", label: "30 days" },
              { value: "90d", label: "90 days" },
              { value: "12mo", label: "12 months" },
              { value: "all", label: "All" },
            ]}
          />
        </FormRow>
        <FormRow
          label="Skip senders matching"
          help="One pattern per line. Supports wildcards like *@noreply.com"
        >
          <Textarea
            rows={3}
            value={form.skipSenders}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                skipSenders: event.target.value,
              }))
            }
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow label="Only messages where">
          <div className="flex flex-col gap-1.5">
            {form.messageFilters.rules.map((rule) => (
              <RuleRow
                key={rule.id}
                rule={rule}
                onChange={updateRule}
                onRemove={() => removeRule(rule.id)}
              />
            ))}
            <button
              type="button"
              onClick={addRule}
              className="inline-flex items-center gap-1 self-start rounded-[3px] px-1.5 py-1 text-[12.5px] text-muted-foreground transition-colors hover:bg-[var(--tint-hover)] hover:text-foreground"
            >
              <PlusIcon className="size-3" />
              Add rule
            </button>
          </div>
        </FormRow>
        <FormRow
          label="Sensitive content"
          help="Redact medical, financial, and government-ID-shaped content before storing."
        >
          <SegmentedControl
            ariaLabel="Sensitive content"
            defaultValue="standard"
            options={[
              { value: "off", label: "Off" },
              { value: "standard", label: "Standard" },
              { value: "strict", label: "Strict" },
            ]}
          />
        </FormRow>
        <div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={save}
          >
            <SaveIcon />
            Save import settings
          </Button>
        </div>
      </Form>
    </DsSection>
  )
}

function uniqueFolderItems(items: Array<{ id: string; label: string; meta?: string }>) {
  return Array.from(new Map(items.map((item) => [item.id, item])).values())
}

function imapConfigFormState(source: DataSource): ImapConfigFormState {
  return {
    folders: source.imap?.watchedFolders ?? ["INBOX"],
    historyWindow: source.imap?.historyWindow ?? "12mo",
    skipSenders: (source.imap?.skipSenders ?? []).join("\n"),
    messageFilters: source.imap?.messageFilters ?? { mode: "and", rules: [] },
  }
}

function formatCount(value: number) {
  return FOLDER_COUNT_FORMATTER.format(value)
}

export { ImapConfig }
