import { describe, expect, it } from "vitest"

import { createSourceSyncRegistry, getSourceSyncAdapter } from "./sync-registry"
import type { SourceSyncAdapter } from "./sync-worker"

describe("source sync registry", () => {
  it("looks up source sync adapters by source type", () => {
    const imapAdapter: SourceSyncAdapter = {
      sourceType: "imap",
      async prepare() {
        return { ok: false, error: { code: "sync_failed", message: "failed" } }
      },
    }
    const formsAdapter: SourceSyncAdapter = {
      sourceType: "forms",
      async prepare() {
        return { ok: false, error: { code: "sync_failed", message: "failed" } }
      },
    }

    const registry = createSourceSyncRegistry([imapAdapter, formsAdapter])

    expect(getSourceSyncAdapter(registry, "imap")).toBe(imapAdapter)
    expect(getSourceSyncAdapter(registry, "forms")).toBe(formsAdapter)
    expect(getSourceSyncAdapter(registry, "stripe")).toBeNull()
  })
})
