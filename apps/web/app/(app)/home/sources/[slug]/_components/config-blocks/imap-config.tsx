"use client"

import * as React from "react"
import { PlusIcon, SaveIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Textarea } from "@workspace/ui/components/textarea"

import { updateImapImportSettingsAction } from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { ChipPicker } from "../chip-picker"
import { DsSection, DsSectionHead } from "../ds-section"
import { RuleRow } from "../rule-row"
import { SegmentedControl } from "../segmented-control"

const DEFAULT_FOLDERS = [
  { id: "INBOX", label: "INBOX", meta: "1,204" },
  { id: "Clients", label: "Clients", meta: "412" },
  { id: "Sent", label: "Sent", meta: "832" },
  { id: "Archive", label: "Archive", meta: "5,210" },
  { id: "Spam", label: "Spam", meta: "39" },
]

type ImapConfigFormState = {
  folders: string[]
  historyWindow: NonNullable<DataSource["imap"]>["historyWindow"]
  skipSenders: string
}

function ImapConfig({ source }: { source: DataSource }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [form, setForm] = React.useState(() =>
    imapConfigFormState(source)
  )

  const folderItems = uniqueFolderItems([
    ...DEFAULT_FOLDERS,
    ...form.folders.map((folder) => ({ id: folder, label: folder })),
  ])

  const save = () => {
    if (!source.sourceRowId || !source.imap) return

    startTransition(async () => {
      const result = await updateImapImportSettingsAction(source.sourceRowId!, {
        historyWindow: form.historyWindow,
        watchedFolders: form.folders,
        skipSenders: form.skipSenders.split("\n"),
      })
      if (!result.error) refresh()
    })
  }

  return (
    <DsSection>
      <DsSectionHead
        title="Folders & filters"
        hint="Only messages matching these rules are imported."
      />
      <Form>
        <FormRow label="Folders to watch">
          <ChipPicker
            items={folderItems}
            defaultValue={form.folders}
            onChange={(folders) =>
              setForm((current) => ({ ...current, folders }))
            }
            mono
          />
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
            <RuleRow field="To" op="is" value="hello@yourpractice.com" />
            <RuleRow field="Subject" op="does not contain" value="invoice" />
            <button
              type="button"
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
        {source.connected ? (
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
        ) : null}
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
  }
}

export { ImapConfig }
