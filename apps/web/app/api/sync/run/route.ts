import { NextResponse } from "next/server"

import type { SyncFailure } from "@/features/data-sources/domain/sync"
import { createDataSourceSyncRuntime } from "@/features/data-sources/adapters/sync-runtime"
import { isAuthorizedSyncWorkerRequest } from "@/features/data-sources/sync-route-auth"
import { getSyncWorkerSecret } from "@/lib/supabase/server-env"

export const runtime = "nodejs"

export async function POST(request: Request) {
  if (
    !isAuthorizedSyncWorkerRequest({
      authorization: request.headers.get("authorization"),
      expectedSecret: getSyncWorkerSecret(),
    })
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const worker = createDataSourceSyncRuntime()
  const result = await worker.runNext({ trigger: "immediate" })
  if (!result.claimed) {
    return NextResponse.json({ status: "idle" })
  }

  if ("failure" in result) {
    console.error("data_source_sync_failed", logContext(result.failure))
    return NextResponse.json(
      {
        status: "failed",
        code: result.failure.code,
        message: result.failure.message,
        sourceId: result.sourceId,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    status: "succeeded",
    sourceId: result.sourceId,
    workspaceId: result.workspaceId,
    persisted: result.persisted,
    truncated: result.truncated,
  })
}

function logContext(failure: SyncFailure) {
  const causeMessage = safeCauseMessage(failure.cause)
  return {
    code: failure.code,
    message: failure.message,
    sourceId: failure.sourceId,
    workspaceId: failure.workspaceId,
    ...(causeMessage ? { causeMessage } : {}),
  }
}

function safeCauseMessage(cause: unknown) {
  const message =
    cause instanceof Error
      ? cause.message
      : hasMessage(cause)
        ? cause.message
        : ""
  if (!message || /password|token|api[_ -]?key|decrypted_secret/i.test(message)) {
    return undefined
  }
  return message.slice(0, 500)
}

function hasMessage(value: unknown): value is { message: string } {
  return (
    typeof value === "object" &&
    value !== null &&
    "message" in value &&
    typeof value.message === "string"
  )
}
