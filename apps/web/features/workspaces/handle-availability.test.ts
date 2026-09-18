import { describe, expect, it, vi } from "vitest"

import {
  HANDLE_MAX_LENGTH,
  isValidWorkspaceHandle,
} from "@/features/workspaces/handle"
import {
  resolveWorkspaceHandleAvailability,
  workspaceHandleAlternative,
} from "@/features/workspaces/handle-availability"

/** A database holding exactly these handles. */
function taking(...taken: string[]) {
  return vi.fn(async (candidate: string) => !taken.includes(candidate))
}

describe("resolveWorkspaceHandleAvailability", () => {
  it("reports a free handle without asking about any alternative", async () => {
    const isFree = taking()

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual(
      { status: "free" }
    )
    expect(isFree.mock.calls).toEqual([["park-therapy"]])
  })

  it("offers the next number when the handle is taken", async () => {
    const isFree = taking("park-therapy")

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual(
      { status: "taken", suggestion: "park-therapy-2" }
    )
  })

  it("keeps counting while the alternatives are taken too", async () => {
    const isFree = taking("park-therapy", "park-therapy-2")

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual(
      { status: "taken", suggestion: "park-therapy-3" }
    )
  })

  it("only ever offers a handle it has confirmed free itself", async () => {
    const isFree = taking(
      "park-therapy",
      ...Array.from({ length: 5 }, (_, i) => `park-therapy-${i + 2}`)
    )

    const result = await resolveWorkspaceHandleAvailability("park-therapy", isFree)

    expect(result).toEqual({ status: "taken", suggestion: "park-therapy-7" })
    // The offered handle is one of the ones that was actually asked about, and the answer
    // for it was yes - a suggestion nobody checked is the whole defect this guards.
    expect(isFree).toHaveBeenCalledWith("park-therapy-7")
    expect(await isFree("park-therapy-7")).toBe(true)
  })

  it("searches as far as the last alternative before giving up", async () => {
    // Pins where the search stops. Off by one in either direction and this fails: one
    // short and `-10` is never offered, one long and the probe list below is wrong.
    const isFree = taking(
      "park-therapy",
      ...Array.from({ length: 8 }, (_, i) => `park-therapy-${i + 2}`)
    )

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual({
      status: "taken",
      suggestion: "park-therapy-10",
    })
  })

  it("offers nothing rather than probing forever", async () => {
    const isFree = vi.fn(async () => false)

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual(
      { status: "taken", suggestion: null }
    )
    // The exact list, not a ceiling: a bound that shrinks is a silently worse suggestion.
    expect(isFree.mock.calls.flat()).toEqual([
      "park-therapy",
      ...Array.from({ length: 9 }, (_, i) => `park-therapy-${i + 2}`),
    ])
  })

  it("normalizes before asking, so what is checked is what would be stored", async () => {
    const isFree = taking()

    await resolveWorkspaceHandleAvailability("  Park  Therapy  ", isFree)

    expect(isFree.mock.calls).toEqual([["park-therapy"]])
  })

  it("answers unknown for a value that could not be stored at all", async () => {
    const isFree = taking()

    expect(await resolveWorkspaceHandleAvailability("pa", isFree)).toEqual({
      status: "unknown",
    })
    expect(await resolveWorkspaceHandleAvailability("!!!", isFree)).toEqual({
      status: "unknown",
    })
    expect(isFree).not.toHaveBeenCalled()
  })

  it("answers unknown when the check itself fails, never taken (OBI-9)", async () => {
    const isFree = vi.fn(async () => {
      throw new Error("database unreachable")
    })

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual(
      { status: "unknown" }
    )
  })

  it("answers unknown when a later probe fails mid-search", async () => {
    const isFree = vi.fn(async (candidate: string) => {
      if (candidate === "park-therapy") return false
      throw new Error("database unreachable")
    })

    expect(await resolveWorkspaceHandleAvailability("park-therapy", isFree)).toEqual(
      { status: "unknown" }
    )
  })
})

describe("workspaceHandleAlternative", () => {
  it("appends the number", () => {
    expect(workspaceHandleAlternative("park-therapy", 2)).toBe("park-therapy-2")
    expect(workspaceHandleAlternative("park-therapy", 10)).toBe("park-therapy-10")
  })

  it("makes room for the suffix instead of losing it to the cap", () => {
    const long = "x".repeat(HANDLE_MAX_LENGTH)
    const alternative = workspaceHandleAlternative(long, 2)

    expect(alternative.endsWith("-2")).toBe(true)
    expect(alternative.length).toBeLessThanOrEqual(HANDLE_MAX_LENGTH)
    expect(isValidWorkspaceHandle(alternative)).toBe(true)
  })

  it("does not leave a doubled dash where the trim landed", () => {
    const base = `${"x".repeat(HANDLE_MAX_LENGTH - 2)}-y`

    expect(workspaceHandleAlternative(base, 2)).toBe(
      `${"x".repeat(HANDLE_MAX_LENGTH - 2)}-2`
    )
  })
})
