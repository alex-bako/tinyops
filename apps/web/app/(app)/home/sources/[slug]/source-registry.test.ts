import { describe, expect, it } from "vitest"

import { SOURCE_IDS } from "@/lib/sources"

import { SOURCE_UI_REGISTRY, getSourceUi } from "./source-registry"

describe("source UI registry", () => {
  it("registers UI adapters for every source id", () => {
    expect(Object.keys(SOURCE_UI_REGISTRY).sort()).toEqual([...SOURCE_IDS].sort())

    for (const sourceId of SOURCE_IDS) {
      const entry = getSourceUi(sourceId)

      expect(entry.id).toBe(sourceId)
      expect(entry.Connection).toBeTypeOf("function")
      expect(entry.Config).toBeTypeOf("function")
      expect(entry.logoClassName).toBeTruthy()
    }
  })

  it("keeps source-specific visual and activity facts in the UI registry", () => {
    expect(getSourceUi("imap").activity).toHaveLength(3)
    expect(getSourceUi("stripe").logoClassName).toContain("#635BFF")
  })
})
