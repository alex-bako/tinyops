import { describe, expect, it } from "vitest"

import { isAuthorizedSyncWorkerRequest } from "@/features/data-sources/sync-route-auth"

describe("sync worker route auth", () => {
  it("accepts only the configured bearer token", () => {
    expect(
      isAuthorizedSyncWorkerRequest({
        authorization: "Bearer sync-secret",
        expectedSecret: "sync-secret",
      })
    ).toBe(true)
    expect(
      isAuthorizedSyncWorkerRequest({
        authorization: "Bearer wrong",
        expectedSecret: "sync-secret",
      })
    ).toBe(false)
    expect(
      isAuthorizedSyncWorkerRequest({
        authorization: null,
        expectedSecret: "sync-secret",
      })
    ).toBe(false)
  })
})
