"use client"

import * as React from "react"
import { BookOpenIcon, PlugZapIcon, RotateCwIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { Input } from "@workspace/ui/components/input"

import type { DataSource } from "@/lib/sources"

import { KeyRow } from "../key-row"
import { SegmentedControl } from "../segmented-control"
import { StatusDot } from "../status-dot"

function ApiKeyConnect({ source }: { source: DataSource }) {
  const masked =
    source.id === "mailerlite"
      ? "ml_••••••••••••••••a4e1"
      : "tch_••••••••••••••••5b22"
  if (!source.connected) {
    return (
      <Form>
        <FormRow
          label="API key"
          help={
            <>
              Generate one in {source.title} under <code>Integrations → API</code>. We
              store it encrypted at rest.
            </>
          }
        >
          <Input
            placeholder={`Paste your ${source.title} API key`}
            className="font-mono text-[12.5px]"
          />
        </FormRow>
        {source.id === "mailerlite" ? (
          <FormRow
            label="Region"
            help="MailerLite Classic and the new MailerLite use different endpoints."
          >
            <SegmentedControl
              ariaLabel="Region"
              defaultValue="new"
              options={[
                { value: "new", label: "MailerLite (new)" },
                { value: "classic", label: "MailerLite Classic" },
              ]}
            />
          </FormRow>
        ) : null}
        <div className="inline-flex items-center gap-3">
          <Button type="button" variant="primary" size="sm">
            <PlugZapIcon />
            Verify & connect
          </Button>
          <Link
            href="/home/sources"
            className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-cobalt-500"
          >
            <BookOpenIcon className="size-3" />
            Where do I find my API key?
          </Link>
        </div>
      </Form>
    )
  }
  return (
    <Form>
      <FormRow label="API key">
        <KeyRow value={masked}>
          <Button type="button" variant="ghost" size="sm">
            <RotateCwIcon />
            Replace
          </Button>
        </KeyRow>
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={{
            variant: "ok",
            label: "Healthy · last verified 2 minutes ago",
          }}
        />
      </FormRow>
    </Form>
  )
}

export { ApiKeyConnect }
