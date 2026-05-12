import { NextResponse } from "next/server"

import { createDeployHealthRuntime } from "@/features/deploy/adapters/health-runtime"
import { isAuthorizedBearerRequest } from "@/lib/http/bearer-auth"
import { getDeployHealthSecret } from "@/lib/supabase/server-env"

export const runtime = "nodejs"

export async function GET(request: Request) {
  if (
    !isAuthorizedBearerRequest({
      authorization: request.headers.get("authorization"),
      expectedSecret: getDeployHealthSecret(),
    })
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }

  const result = await createDeployHealthRuntime().check()
  const status = result.status === "ok" ? 200 : 503

  return NextResponse.json(result, { status })
}
