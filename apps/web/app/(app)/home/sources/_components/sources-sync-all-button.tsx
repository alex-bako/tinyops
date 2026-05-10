"use client"

import { RefreshCwIcon } from "lucide-react"

import { Button } from "@workspace/ui/components/button"

import { requestAllDataSourceSyncsAction } from "@/features/data-sources/actions"
import { useSourceSyncRequest } from "./source-sync-request"

function SourcesSyncAllButton({
  disabled,
}: {
  disabled: boolean
}) {
  const syncRequest = useSourceSyncRequest({
    request: requestAllDataSourceSyncsAction,
    successMessage: syncAllMessage,
    errorMessage: "Could not queue syncs",
  })

  return (
    <span className="inline-flex items-center gap-2">
      <Button
        type="button"
        variant="tertiary"
        size="sm"
        disabled={disabled || syncRequest.pending}
        onClick={syncRequest.run}
      >
        <RefreshCwIcon />
        {syncRequest.pending ? "Syncing" : "Sync all"}
      </Button>
      {syncRequest.message ? (
        <span
          role="status"
          className="max-w-[180px] truncate text-[12px] text-muted-foreground"
        >
          {syncRequest.message}
        </span>
      ) : null}
    </span>
  )
}

function syncAllMessage(result: { queued: number }) {
  const queued = `${result.queued} ${plural("source", result.queued)}`
  return `Queued ${queued}`
}

function plural(label: string, count: number) {
  return count === 1 ? label : `${label}s`
}

export { SourcesSyncAllButton }
