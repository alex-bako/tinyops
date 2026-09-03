"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { PlugZapIcon, ShieldCheckIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import {
  connectStripeDataSourceAction,
  inspectStripeAccountAction,
} from "@/features/data-sources/actions"
import type { StripeAccountInspection } from "@/features/data-sources/application"
import type { DataSource } from "@/lib/sources"

import { KeyRow } from "../key-row"
import { StatusDot } from "../status-dot"

function StripeConnect({ source }: { source: DataSource }) {
  if (source.kind === "data_source") return <ConnectedStripe source={source} />
  return <NewStripe />
}

function ConnectedStripe({ source }: { source: DataSource }) {
  const stripe = source.kind === "data_source" ? source.stripe : undefined
  return (
    <Form>
      <FormRow label="Account">
        <KeyRow value={stripe?.accountId ?? "—"} />
      </FormRow>
      <FormRow label="API key">
        <KeyRow value={stripe?.apiKeyMasked ?? "stored"} />
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={{
            variant: "ok",
            label: `Connected · ${stripe?.livemode ? "live" : "test"} mode · syncing from ${
              stripe?.syncFrom ? stripe.syncFrom.slice(0, 10) : "the beginning"
            }`,
          }}
        />
      </FormRow>
    </Form>
  )
}

function NewStripe() {
  const { replace } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(null)
  const [apiKey, setApiKey] = React.useState("")
  const [displayName, setDisplayName] = React.useState("")
  const [syncFrom, setSyncFrom] = React.useState(defaultSyncFrom)
  const [account, setAccount] = React.useState<StripeAccountInspection | null>(
    null
  )

  const verify = () => {
    setError(null)
    startTransition(async () => {
      const result = await inspectStripeAccountAction(apiKey)
      if (result.error) {
        setError(stripeErrorLabel(result.error))
        return
      }
      setAccount(result.data)
      if (!displayName.trim()) setDisplayName(result.data.name)
    })
  }

  const connect = () => {
    setError(null)
    startTransition(async () => {
      const result = await connectStripeDataSourceAction({
        apiKey,
        displayName,
        syncFrom: new Date(`${syncFrom}T00:00:00.000Z`).toISOString(),
      })
      if (result.error) {
        setError(stripeErrorLabel(result.error))
        return
      }
      replace(`/home/sources/${result.data.type}/${result.data.sourceSlug}`)
    })
  }

  return (
    <Form>
      <FormRow
        label="Secret key"
        help={
          <>
            Create one in Stripe under <code>Developers → API keys</code>. It is
            stored encrypted and only ever used to read your account.
          </>
        }
      >
        <Input
          type="password"
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value)
            setAccount(null)
          }}
          placeholder="sk_live_…"
          className="font-mono text-[12.5px]"
        />
      </FormRow>
      <FormRow
        label="Import from"
        help="Payments, refunds, invoices and subscriptions created before this date are skipped."
      >
        <Input
          type="date"
          value={syncFrom}
          onChange={(event) => setSyncFrom(event.target.value)}
          className="font-mono text-[12.5px]"
        />
      </FormRow>
      {account ? (
        <>
          <FormRow label="Name">
            <Input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder={account.name}
            />
          </FormRow>
          <FormRow label="Account">
            <StatusDot
              status={{
                variant: "ok",
                label: `${account.name} · ${account.accountId} · ${
                  account.livemode ? "live" : "test"
                } mode`,
              }}
            />
          </FormRow>
        </>
      ) : null}
      <div className="inline-flex items-center gap-3">
        {account ? (
          <Button
            type="button"
            variant="primary"
            size="sm"
            disabled={pending || !syncFrom}
            onClick={connect}
          >
            <PlugZapIcon />
            Connect Stripe
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

function defaultSyncFrom() {
  const date = new Date()
  date.setUTCFullYear(date.getUTCFullYear() - 1)
  return date.toISOString().slice(0, 10)
}

function stripeErrorLabel(error: string) {
  if (error === "invalid_stripe_config") {
    return "Paste a Stripe secret key (starts with sk_live_ or sk_test_)."
  }
  if (error === "stripe_access_failed") {
    return "Stripe rejected that key. Check it and try again."
  }
  if (error === "stripe_api_failed") {
    return "Stripe did not respond. Try again in a moment."
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
    return "That Stripe account is already connected."
  }
  return "Could not connect Stripe."
}

export { StripeConnect }
