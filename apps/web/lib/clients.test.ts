import { describe, expect, it } from "vitest"

import {
  clientBySlug,
  slugify,
} from "@/features/clients/adapters/mock-client-memory"

describe("clients", () => {
  it("creates stable ascii slugs", () => {
    expect(slugify("Tomás Álvarez")).toBe("tomas-alvarez")
  })

  it("finds generated details by slug", () => {
    expect(clientBySlug("anna-smith")?.email).toBe("anna@example.com")
  })
})
