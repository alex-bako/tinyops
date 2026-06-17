"use client"

import * as React from "react"
import { useSearchParams } from "next/navigation"
import { ExternalLinkIcon, RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"

import { startGmailOAuthAction } from "@/features/data-sources/actions"
import type { DataSource } from "@/lib/sources"

import { StatusDot } from "../status-dot"

function GmailConnect({ source }: { source: DataSource }) {
  const searchParams = useSearchParams()
  const [pending, startTransition] = React.useTransition()
  const [error, setError] = React.useState<string | null>(() =>
    callbackErrorLabel(searchParams.get("error"))
  )

  const beginOAuth = () => {
    setError(null)
    startTransition(async () => {
      const result = await startGmailOAuthAction()
      if ("url" in result) {
        window.location.assign(result.url)
        return
      }
      setError(actionErrorLabel(result.error))
    })
  }

  if (!source.connected) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-[color:var(--rule-strong)] bg-[var(--tint-hover)] p-5">
        <p className="m-0 max-w-[56ch] text-[13px] leading-[1.55] text-foreground/85">
          You&apos;ll be redirected to Google to grant TinyOps read-only access
          to your Gmail. We never send email or write back to your account.
        </p>
        <Button
          type="button"
          variant="primary"
          size="sm"
          disabled={pending}
          onClick={beginOAuth}
        >
          <ExternalLinkIcon />
          Connect Google
        </Button>
        {error ? (
          <span className="text-[12px] text-coral-700">{error}</span>
        ) : null}
      </div>
    )
  }

  const needsReconnect = source.connected && source.health === "error"

  return (
    <Form>
      <FormRow label="Account">
        <div className="flex items-center gap-2.5 rounded-sm bg-[var(--tint-hover)] px-3 py-2">
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="truncate text-[13px] font-medium text-foreground">
              {source.title}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Gmail · read-only (gmail.readonly)
            </span>
          </div>
          <Button
            type="button"
            variant={needsReconnect ? "primary" : "ghost"}
            size="sm"
            disabled={pending}
            onClick={beginOAuth}
          >
            <RefreshCwIcon />
            Reconnect
          </Button>
        </div>
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={
            needsReconnect
              ? { variant: "warn", label: "Reconnect needed · access was revoked" }
              : { variant: "ok", label: "Connected · token refreshes automatically" }
          }
        />
      </FormRow>
      {error ? (
        <span className="text-[12px] text-coral-700">{error}</span>
      ) : null}
    </Form>
  )
}

function actionErrorLabel(error: string) {
  if (error === "forbidden") {
    return "Only workspace owners and admins can connect Gmail."
  }
  if (error === "oauth_unconfigured") {
    return "Google OAuth is not configured for this environment."
  }
  return "Could not start the Google connection."
}

function callbackErrorLabel(error: string | null): string | null {
  if (!error) return null
  if (error === "oauth_denied") return "Google access was not granted."
  if (error === "invalid_state") return "The connection request expired. Try again."
  if (error === "connect_failed") return "That Gmail account could not be connected."
  if (error === "exchange_failed") return "Google sign-in failed. Try again."
  return null
}

export { GmailConnect }
