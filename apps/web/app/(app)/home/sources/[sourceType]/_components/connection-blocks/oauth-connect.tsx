import { BookOpenIcon, ExternalLinkIcon } from "lucide-react"
import Link from "next/link"

import { Button } from "@workspace/ui/components/button"
import { Form, FormRow } from "@workspace/ui/components/form-row"
import { TonalAvatar } from "@workspace/ui/components/tonal-avatar"

import type { DataSource } from "@/lib/sources"

import { StatusDot } from "../status-dot"

function OAuthConnect({ source }: { source: DataSource }) {
  if (!source.connected) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-[color:var(--rule-strong)] bg-[var(--tint-hover)] p-5">
        <p className="m-0 max-w-[56ch] text-[13px] leading-[1.55] text-foreground/85">
          You&apos;ll be redirected to {source.title} to grant TinyOps read-only
          access. We never write back to your account.
        </p>
        <Button type="button" variant="primary" size="sm">
          <ExternalLinkIcon />
          Connect {source.title}
        </Button>
        <Link
          href="/home/sources"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-cobalt-500"
        >
          <BookOpenIcon className="size-3" />
          What permissions are requested?
        </Link>
      </div>
    )
  }
  return (
    <Form>
      <FormRow label="Account">
        <div className="flex items-center gap-2.5 rounded-sm bg-[var(--tint-hover)] px-3 py-2">
          <TonalAvatar name="Jamie Park" size="sm" />
          <div className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="text-[13px] font-medium text-foreground">
              jamie@yourpractice.com
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              Connected May 2 · scopes: read.events, read.subscribers
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm">
            Re-auth
          </Button>
        </div>
      </FormRow>
      <FormRow label="Status">
        <StatusDot
          status={{
            variant: "ok",
            label: "Healthy · token refreshes automatically",
          }}
        />
      </FormRow>
    </Form>
  )
}

export { OAuthConnect }
