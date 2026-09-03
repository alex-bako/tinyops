"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlugZapIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import {
  connectMailerLiteDataSourceAction,
  inspectMailerLiteAccountAction,
} from "@/features/data-sources/actions"
import type { MailerLiteInspection } from "@/features/data-sources/application"
import type { DataSource } from "@/lib/sources"

import { KeyRow } from "../key-row"
import { StatusDot } from "../status-dot"

function MailerLiteConnect({ source }: { source: DataSource }) {
  if (source.kind === "data_source") return <ConnectedMailerLite source={source} />
  return <NewMailerLite />
}

function ConnectedMailerLite({ source }: { source: DataSource }) {
  const mailerlite = source.kind === "data_source" ? source.mailerlite : undefined
  return (
    <Form>
      <FormRow label="Shops">
        <KeyRow value={shopsLabel(mailerlite?.shops ?? [])} />
      </FormRow>
      <FormRow label="API key">
        <KeyRow value={mailerlite?.apiKeyMasked ?? "stored"} />
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={{
            variant: "ok",
            label: `Connected · syncing from ${
              mailerlite?.syncFrom ? mailerlite.syncFrom.slice(0, 10) : "the beginning"
            }`,
          }}
        />
      </FormRow>
    </Form>
  )
}

function NewMailerLite() {
  const { replace } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [apiKey, setApiKey] = React.useState("")
  const [displayName, setDisplayName] = React.useState("MailerLite")
  const [syncFrom, setSyncFrom] = React.useState(defaultSyncFrom)
  const [inspection, setInspection] = React.useState<MailerLiteInspection | null>(
    null
  )

  const verify = () => {
    setError(null)
    startTransition(async () => {
      const result = await inspectMailerLiteAccountAction(apiKey)
      if (result.error) {
        setError(mailerLiteErrorLabel(result.error))
        return
      }
      setInspection(result.data)
    })
  }

  const connect = () => {
    setError(null)
    startTransition(async () => {
      const result = await connectMailerLiteDataSourceAction({
        apiKey,
        displayName,
        syncFrom: new Date(`${syncFrom}T00:00:00.000Z`).toISOString(),
      })
      if (result.error) {
        setError(mailerLiteErrorLabel(result.error))
        return
      }
      replace(`/home/sources/${result.data.type}/${result.data.sourceSlug}`)
    })
  }

  return (
    <Form>
      <FormRow
        label="API key"
        help={
          <>
            Create one in MailerLite under <code>Integrations → API</code>. It is
            stored encrypted and only ever used to read your account.
          </>
        }
      >
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value)
            setInspection(null)
          }}
          placeholder="Paste your MailerLite API key"
          className="font-mono text-[12.5px]"
        />
      </FormRow>
      <FormRow
        label="Import from"
        help="Orders and campaigns before this date are skipped. Subscribers are always imported."
      >
        <Input
          type="date"
          value={syncFrom}
          onChange={(event) => setSyncFrom(event.target.value)}
          className="font-mono text-[12.5px]"
        />
      </FormRow>
      {inspection ? (
        <>
          <FormRow label="Name">
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="MailerLite"
            />
          </FormRow>
          <FormRow label="Account">
            <StatusDot
              status={{
                variant: "ok",
                label: `Key works · ${shopsLabel(inspection.shops)}`,
              }}
            />
          </FormRow>
        </>
      ) : null}
      <div className="inline-flex items-center gap-3">
        {inspection ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending || !syncFrom}
            onClick={connect}
          >
            <PlugZapIcon />
            Connect MailerLite
          </Button>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending || !apiKey.trim()}
            onClick={verify}
          >
            <ShieldCheckIcon />
            Verify key
          </Button>
        )}
        {error ? (
          <span className="text-[12px] text-coral-700">{error}</span>
        ) : null}
      </div>
    </Form>
  )
}

function shopsLabel(shops: Array<{ name: string }>) {
  return shops.length > 0
    ? shops.map((shop) => shop.name).join(", ")
    : "no e-commerce shop (purchases come from groups and fields)"
}

function defaultSyncFrom() {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - 1)
  return date.toISOString().slice(0, 10)
}

function mailerLiteErrorLabel(error: string) {
  if (error === "invalid_mailerlite_config") {
    return "Paste the full MailerLite API key."
  }
  if (error === "mailerlite_access_failed") {
    return "MailerLite rejected that key. Check it and try again."
  }
  if (error === "mailerlite_api_failed") {
    return "MailerLite did not respond. Try again in a moment."
  }
  if (error === "source_manage_forbidden") {
    return "Only workspace owners and admins can manage data sources."
  }
  if (error === "invalid_data_source_name") {
    return "Name this connector before saving."
  }
  if (error === "duplicate_data_source_name") {
    return "Use a different connector name."
  }
  if (error === "duplicate_data_source_config") {
    return "That MailerLite account is already connected."
  }
  return "Could not connect MailerLite."
}

export { MailerLiteConnect }
