"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { requestDataSourceSyncAction } from "@/features/data-sources/actions"

function SourceSyncButton({ sourceId }: { sourceId: string }) {
  const { refresh } = useRouter()
  const [pending, startTransition] = React.useTransition()
  const [message, setMessage] = React.useState<string | null>(null)

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          setMessage(null)
          startTransition(async () => {
            const result = await requestDataSourceSyncAction(sourceId)
            if (result.error) {
              setMessage("Could not queue sync")
              return
            }
            setMessage("Sync queued")
            refresh()
          })
        }}
      >
        <RefreshCwIcon />
        {pending ? "Syncing" : "Sync now"}
      </Button>
      {message ? (
        <span
          role="status"
          aria-label="Sync request status"
          className="text-[12px] text-muted-foreground"
        >
          {message}
        </span>
      ) : null}
    </span>
  )
}

export { SourceSyncButton }
