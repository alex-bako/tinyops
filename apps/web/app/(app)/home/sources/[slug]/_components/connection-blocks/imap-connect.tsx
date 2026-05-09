"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlugZapIcon, SaveIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import {
  connectImapDataSourceAction,
  updateImapConnectionSettingsAction,
} from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { SegmentedControl } from "../segmented-control"
import { StatusDot } from "../status-dot"

type ImapConnectionFormState = {
  server: string
  port: string
  username: string
  password: string
  encryption: NonNullable<DataSource["imap"]>["encryption"]
}

function ImapConnect({ source }: { source: DataSource }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState(() =>
    imapConnectionFormState(source)
  )

  const connectionSettings = {
    host: form.server,
    port: form.port,
    encryption: form.encryption,
    username: form.username,
  }

  const submit = () => {
    setError(null)
    startTransition(async () => {
      const result =
        source.connected && source.sourceRowId && form.password.trim() === ""
          ? await updateImapConnectionSettingsAction(
              source.sourceRowId,
              connectionSettings
            )
          : await connectImapDataSourceAction({
              ...connectionSettings,
              password: form.password,
              historyWindow: source.imap?.historyWindow ?? "12mo",
              watchedFolders: source.imap?.watchedFolders ?? ["INBOX"],
              skipSenders: source.imap?.skipSenders ?? [],
            })

      if (result.error) {
        setError(imapErrorLabel(result.error))
        return
      }
      refresh()
    })
  }

  return (
    <Form>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Server" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            value={form.server}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                server: event.target.value,
              }))
            }
            placeholder="imap.example.com"
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow label="Port" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            value={form.port}
            onChange={(event) =>
              setForm((current) => ({ ...current, port: event.target.value }))
            }
            inputMode="numeric"
            className="font-mono text-[12.5px]"
          />
        </FormRow>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormRow label="Username" className="sm:grid-cols-[100px_minmax(0,1fr)]">
          <Input
            value={form.username}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                username: event.target.value,
              }))
            }
            placeholder="hello@example.com"
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        <FormRow
          label="App password"
          className="sm:grid-cols-[100px_minmax(0,1fr)]"
        >
          <Input
            type="password"
            value={form.password}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                password: event.target.value,
              }))
            }
            placeholder={
              source.connected
                ? source.imap?.passwordMasked ?? "Leave blank to keep"
                : "App password"
            }
            className="font-mono text-[12.5px]"
          />
        </FormRow>
      </div>
      <FormRow label="Encryption">
        <SegmentedControl
          ariaLabel="Encryption"
          value={form.encryption}
          onChange={(next) =>
            setForm((current) => ({
              ...current,
              encryption: next as ImapConnectionFormState["encryption"],
            }))
          }
          options={[
            { value: "ssl", label: "SSL/TLS" },
            { value: "starttls", label: "STARTTLS" },
            { value: "none", label: "None" },
          ]}
        />
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={{
            variant: source.connected ? "ok" : "off",
            label: source.connected
              ? `Connected · ${source.imap?.watchedFolders.length ?? 0} folders watched`
              : "Not connected",
          }}
        />
      </FormRow>
      <div className="inline-flex items-center gap-3">
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={submit}
        >
          {source.connected ? <SaveIcon /> : <PlugZapIcon />}
          {source.connected ? "Save settings" : "Verify & connect"}
        </Button>
        {error ? (
          <span className="text-[12px] text-coral-700">{error}</span>
        ) : null}
      </div>
    </Form>
  )
}

function imapErrorLabel(error: string) {
  if (error === "imap_connection_failed") {
    return "Connection failed. Check host, port, username, and app password."
  }
  if (error === "source_manage_forbidden") {
    return "Only workspace owners and admins can manage data sources."
  }
  return "Could not save IMAP connection."
}

function imapConnectionFormState(source: DataSource): ImapConnectionFormState {
  return {
    server: source.imap?.host ?? "",
    port: String(source.imap?.port ?? 993),
    username: source.imap?.username ?? "",
    password: "",
    encryption: source.imap?.encryption ?? "ssl",
  }
}

export { ImapConnect }
