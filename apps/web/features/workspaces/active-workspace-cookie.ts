import { cookies } from "next/headers"

import {
  ACTIVE_WORKSPACE_COOKIE,
  type ActiveWorkspaceStore,
} from "@/features/workspaces/active-workspace"

export function createCookieActiveWorkspaceStore(): ActiveWorkspaceStore {
  return {
    async read() {
      const cookieStore = await cookies()
      return cookieStore.get(ACTIVE_WORKSPACE_COOKIE)?.value ?? null
    },
    async write(id) {
      const cookieStore = await cookies()
      cookieStore.set(ACTIVE_WORKSPACE_COOKIE, id, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      })
    },
  }
}
