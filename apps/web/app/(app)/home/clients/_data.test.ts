import { describe, expect, it } from "vitest"

import { ALL_CLIENTS } from "@/lib/clients"

import { countFor, matchesFilter } from "./_filters"

describe("client filter data", () => {
  it("matches sensitive clients by status or flag", () => {
    expect(matchesFilter(ALL_CLIENTS[3]!, "sensitive")).toBe(true)
    expect(matchesFilter(ALL_CLIENTS[0]!, "sensitive")).toBe(false)
  })

  it("counts filter matches from rows", () => {
    expect(countFor(ALL_CLIENTS, "overdue")).toBe(5)
    expect(countFor(ALL_CLIENTS, "dnc")).toBe(1)
  })
})
