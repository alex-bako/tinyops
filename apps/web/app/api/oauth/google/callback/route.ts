import { cookies } from "next/headers"
import { NextResponse, type NextRequest } from "next/server"

import { createGmailConnectionProbe } from "@/features/data-sources/gmail/gmail-connection-probe"
import { completeGmailOAuthCallback } from "@/features/data-sources/gmail/gmail-oauth-callback"
import {
  exchangeGmailCode,
  GMAIL_OAUTH_STATE_COOKIE,
} from "@/features/data-sources/gmail/gmail-oauth"
import { createDataSourceServerContext } from "@/features/data-sources/loaders"
import { dispatchDataSourceSyncWorker } from "@/features/data-sources/sync-dispatcher"
import { getLogger } from "@/lib/logging"
import { createServerSupabaseClient } from "@/lib/supabase/server"
import {
  getGmailOAuthConfig,
  getOptionalSyncWorkerSecret,
  getOptionalTinyOpsAppBaseUrl,
} from "@/lib/supabase/server-env"

export const runtime = "nodejs"

const SOURCES_PATH = "/home/sources/gmail"

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const logger = getLogger().child({ component: "gmail_oauth_callback" })

  if (url.searchParams.get("error")) {
    return redirect(request, `${SOURCES_PATH}?error=oauth_denied`)
  }

  const context = await createDataSourceServerContext()
  if (!context) return redirect(request, "/login")

  const cookieStore = await cookies()
  const expectedState = cookieStore.get(GMAIL_OAUTH_STATE_COOKIE)?.value ?? null
  cookieStore.delete(GMAIL_OAUTH_STATE_COOKIE)

  let config
  try {
    config = getGmailOAuthConfig()
  } catch {
    return redirect(request, `${SOURCES_PATH}?error=oauth_unconfigured`)
  }

  const supabase = await createServerSupabaseClient()
  const probe = createGmailConnectionProbe()

  const result = await completeGmailOAuthCallback({
    workspaceId: context.workspace.id,
    code: url.searchParams.get("code"),
    state: url.searchParams.get("state"),
    expectedState,
    deps: {
      exchangeCode: (code) => exchangeGmailCode(config, code),
      probe: (accessToken) => probe.probe({ accessToken }),
      connect: async (args) => {
        const { error } = await supabase.rpc("connect_gmail_data_source", args)
        return { error: error ? { message: error.message } : null }
      },
    },
  })

  if (!result.ok) {
    logger.warn(
      { event: "gmail.oauth.callback_failed", reason: result.reason },
      "gmail oauth callback failed"
    )
    return redirect(request, `${SOURCES_PATH}?error=${result.reason}`)
  }

  await dispatchSync(logger)
  return redirect(request, `${SOURCES_PATH}?connected=1`)
}

function redirect(request: NextRequest, path: string) {
  return NextResponse.redirect(new URL(path, request.url))
}

async function dispatchSync(logger: ReturnType<typeof getLogger>) {
  try {
    await dispatchDataSourceSyncWorker({
      baseUrl: getOptionalTinyOpsAppBaseUrl(),
      secret: getOptionalSyncWorkerSecret(),
    })
  } catch {
    logger.warn(
      { event: "gmail.oauth.dispatch_failed" },
      "gmail sync dispatch failed"
    )
  }
}
