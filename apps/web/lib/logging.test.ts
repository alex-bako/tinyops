import { describe, expect, it } from "vitest"

import { createLogger } from "@/lib/logging"

describe("app logger", () => {
  it("emits structured child-context logs with secret redaction", () => {
    const chunks: string[] = []
    const logger = createLogger({
      name: "tinyops-test",
      level: "debug",
      destination: {
        write(chunk: string) {
          chunks.push(chunk)
        },
      },
    })

    logger
      .child({ component: "sync", workspaceId: "workspace_1" })
      .info(
        {
          event: "sync.test",
          password: "plain-password",
          headers: { authorization: "Bearer secret-token" },
          nested: { apiKey: "api-key-value" },
          safe: "kept",
        },
        "logged"
      )

    const entry = JSON.parse(chunks[0]!)
    expect(entry).toMatchObject({
      name: "tinyops-test",
      severity: "INFO",
      component: "sync",
      workspaceId: "workspace_1",
      event: "sync.test",
      safe: "kept",
      msg: "logged",
    })
    expect(entry.password).toBe("[Redacted]")
    expect(entry.headers.authorization).toBe("[Redacted]")
    expect(entry.nested.apiKey).toBe("[Redacted]")
    expect(JSON.stringify(entry)).not.toContain("plain-password")
    expect(JSON.stringify(entry)).not.toContain("secret-token")
    expect(JSON.stringify(entry)).not.toContain("api-key-value")
  })
})
