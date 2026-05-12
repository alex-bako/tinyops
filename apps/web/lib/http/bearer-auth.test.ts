import { describe, expect, it } from "vitest"

import { isAuthorizedBearerRequest } from "@/lib/http/bearer-auth"

describe("bearer auth", () => {
  it("accepts only a request bearer token matching a non-empty expected secret", () => {
    expect(
      isAuthorizedBearerRequest({
        authorization: "Bearer deploy-secret",
        expectedSecret: " deploy-secret ",
      })
    ).toBe(true)
    expect(
      isAuthorizedBearerRequest({
        authorization: "Bearer wrong",
        expectedSecret: "deploy-secret",
      })
    ).toBe(false)
    expect(
      isAuthorizedBearerRequest({
        authorization: null,
        expectedSecret: "deploy-secret",
      })
    ).toBe(false)
    expect(
      isAuthorizedBearerRequest({
        authorization: "Bearer deploy-secret",
        expectedSecret: " ",
      })
    ).toBe(false)
  })
})
