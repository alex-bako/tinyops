import { NextResponse } from "next/server"

import { createDataSourceSyncRuntime } from "@/features/data-sources/adapters/sync-runtime"
import { isAuthorizedBearerRequest } from "@/lib/http/bearer-auth"
import { getLogger } from "@/lib/logging"
import { getCronSecret } from "@/lib/supabase/server-env"

export const runtime = "nodejs"

const CRON_BATCH_SIZE = 50

export async function GET(request: Request) {
  const logger = getLogger().child({ component: "sync_drain_route" })
  if (
    !isAuthorizedBearerRequest({
      authorization: request.headers.get("authorization"),
      expectedSecret: getCronSecret(),
    })
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  try {
    const worker = createDataSourceSyncRuntime()
    const result = await worker.runBatch({
      trigger: "cron",
      maxJobs: CRON_BATCH_SIZE,
    })

    return NextResponse.json({
      status: "drained",
      claimed: result.claimed,
      succeeded: result.succeeded,
      failed: result.failed,
    })
  } catch (error) {
    logger.error(
      { event: "data_source_sync_drain_failed", ...safeRouteError(error) },
      "data source sync drain failed"
    )
    return NextResponse.json({ error: "sync_drain_failed" }, { status: 500 })
  }
}

function safeRouteError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unknown error"
  return { message: message.slice(0, 500) }
}
